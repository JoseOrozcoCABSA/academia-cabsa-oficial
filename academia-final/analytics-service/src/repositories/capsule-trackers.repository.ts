import { activeMembershipsSql, first, guardedInsert, membershipCondition, membershipFilter, normalizedNumber, range, rows, scholarshipName, secureHash, streakForDates, type Row, type TrackerFilters } from './trackers-query-context.js';

export class CapsuleTrackersRepository {
  async capsules(filters: TrackerFilters) {
    const values: Record<string, unknown> = {
      fromDate: `${filters.from} 00:00:00`,
      toDate: `${filters.to} 23:59:59`,
      from: filters.from,
      to: filters.to,
      userSearch: `%${filters.user ?? ''}%`,
      scholarshipLevel: filters.scholarshipLevel || 0,
    };
    const userFilter = filters.user
      ? `AND (p.display_name LIKE :userSearch OR p.email LIKE :userSearch OR p.username LIKE :userSearch)`
      : '';
    const modernProgressSql = `
      SELECT CONCAT('soa-',p.id) row_id,p.user_id user_key,u.display_name,u.email,u.username,
        p.capsule_id,COALESCE(c.title,CONCAT('Cápsula #',p.capsule_id)) title,
        p.semaphore_status status,p.updated_at activity_at,
        COALESCE(
          (SELECT membership_activation.nivel_membresia_id FROM usuarios_activaciones_becas membership_activation
           WHERE membership_activation.user_id=u.id AND membership_activation.suspended_at IS NULL
             AND (membership_activation.vigente_hasta IS NULL OR membership_activation.vigente_hasta>=CURDATE())
           ORDER BY membership_activation.activado_en DESC,membership_activation.id DESC LIMIT 1),
          (SELECT legacy_membership.membership_id FROM usuarios_membresias legacy_membership
           WHERE legacy_membership.user_id=u.legacy_wp_user_id AND legacy_membership.status='active'
             AND (legacy_membership.enddate IS NULL OR legacy_membership.enddate>=NOW())
           ORDER BY legacy_membership.startdate DESC,legacy_membership.id DESC LIMIT 1)
        ) membership_level_id
      FROM analitica_progreso_capsulas p
      LEFT JOIN usuarios_cuentas u ON u.id=p.user_id
      LEFT JOIN contenido_capsulas c ON c.id=p.capsule_id
      WHERE p.updated_at BETWEEN :fromDate AND :toDate ${userFilter.replaceAll('p.', 'u.')}
        ${membershipFilter(filters, 'u.id', 'u.legacy_wp_user_id')}`;
    const legacyProgressSql = `
      SELECT CONCAT('legacy-',a.id) row_id,COALESCE(u.id,CONCAT('legacy-',a.user_id)) user_key,
        u.display_name,u.email,u.username,a.post_id capsule_id,
        COALESCE(NULLIF(a.titulo,''),CONCAT('Cápsula #',a.post_id)) title,
        CASE a.estatus WHEN 'verde' THEN 'GREEN' WHEN 'amarillo' THEN 'YELLOW' ELSE 'RED' END status,
        a.fecha_actualizado activity_at,
        COALESCE(
          (SELECT membership_activation.nivel_membresia_id FROM usuarios_activaciones_becas membership_activation
           WHERE membership_activation.user_id=u.id AND membership_activation.suspended_at IS NULL
             AND (membership_activation.vigente_hasta IS NULL OR membership_activation.vigente_hasta>=CURDATE())
           ORDER BY membership_activation.activado_en DESC,membership_activation.id DESC LIMIT 1),
          (SELECT legacy_membership.membership_id FROM usuarios_membresias legacy_membership
           WHERE legacy_membership.user_id=u.legacy_wp_user_id AND legacy_membership.status='active'
             AND (legacy_membership.enddate IS NULL OR legacy_membership.enddate>=NOW())
           ORDER BY legacy_membership.startdate DESC,legacy_membership.id DESC LIMIT 1)
        ) membership_level_id
      FROM analitica_avances_capsulas a
      LEFT JOIN usuarios_cuentas u ON u.legacy_wp_user_id=a.user_id
      WHERE a.fecha_actualizado BETWEEN :fromDate AND :toDate ${userFilter.replaceAll('p.', 'u.')}
        ${membershipFilter(filters, 'u.id', 'u.legacy_wp_user_id')}`;
    const [modernProgress, legacyProgress, capsuleCatalog] = await Promise.all([
      rows<Row>(modernProgressSql, values),
      rows<Row>(legacyProgressSql, values),
      rows<Row>(
        `SELECT id capsule_id,title,category,published_at
         FROM contenido_capsulas WHERE status='published'
         ORDER BY title`,
      ),
    ]);
    const progress = [...modernProgress, ...legacyProgress];
    const topCapsuleMap = new Map<string, Record<string, unknown>>();
    const userMap = new Map<string, Record<string, unknown>>();
    const scholarshipMap = new Map<number, { level_id: number; name: string; users: Set<string>; interactions: number }>();
    for (const item of progress) {
      const capsuleId = String(item.capsule_id);
      const capsule = topCapsuleMap.get(capsuleId) ?? {
        capsule_id: item.capsule_id, title: item.title, responses: 0, green: 0, yellow: 0, red: 0, last_activity: item.activity_at,
      };
      capsule.responses = normalizedNumber(capsule.responses) + 1;
      capsule[String(item.status).toLowerCase()] = normalizedNumber(capsule[String(item.status).toLowerCase()]) + 1;
      if (String(item.activity_at) > String(capsule.last_activity)) capsule.last_activity = item.activity_at;
      topCapsuleMap.set(capsuleId, capsule);
      const userKey = String(item.user_key);
      const user = userMap.get(userKey) ?? {
        user_id: userKey, display_name: item.display_name || `Usuario ${userKey.slice(0, 8)}`,
        email: item.email, capsules: 0, green: 0, yellow: 0, red: 0, last_activity: item.activity_at,
      };
      user.capsules = normalizedNumber(user.capsules) + 1;
      user[String(item.status).toLowerCase()] = normalizedNumber(user[String(item.status).toLowerCase()]) + 1;
      if (String(item.activity_at) > String(user.last_activity)) user.last_activity = item.activity_at;
      userMap.set(userKey, user);
      const levelId = Number(item.membership_level_id || 0);
      if (levelId > 0) {
        const scholarship = scholarshipMap.get(levelId) ?? {
          level_id: levelId, name: scholarshipName(levelId), users: new Set<string>(), interactions: 0,
        };
        scholarship.users.add(userKey);
        scholarship.interactions += 1;
        scholarshipMap.set(levelId, scholarship);
      }
    }
    const [legacyDays, modernDays, legacyStreaks] = await Promise.all([
      rows<Row>(
        `SELECT COALESCE(u.id,CONCAT('legacy-',d.user_id)) user_key,d.fecha activity_date,
          d.visitas,d.ultimo_acceso,u.display_name,u.email
         FROM analitica_dias_activos d LEFT JOIN usuarios_cuentas u ON u.legacy_wp_user_id=d.user_id
         WHERE d.fecha BETWEEN :from AND :to ${userFilter.replaceAll('p.', 'u.')}
           ${membershipFilter(filters, 'u.id', 'u.legacy_wp_user_id')}`,
        values,
      ),
      rows<Row>(
        `SELECT a.user_id user_key,a.activity_date,
          a.capsule_completions+a.lesson_completions visitas,a.last_activity_at ultimo_acceso,
          u.display_name,u.email
         FROM analitica_actividad_aprendizaje a LEFT JOIN usuarios_cuentas u ON u.id=a.user_id
         WHERE a.activity_date BETWEEN :from AND :to ${userFilter.replaceAll('p.', 'u.')}
           ${membershipFilter(filters, 'u.id', 'u.legacy_wp_user_id')}`,
        values,
      ),
      rows<Row>(
        `SELECT COALESCE(u.id,CONCAT('legacy-',r.user_id)) user_key,u.display_name,u.email,
          r.total_dias_activos total_days,r.racha_actual current_streak,r.mejor_racha best_streak,r.ultimo_acceso last_activity
         FROM analitica_rachas r LEFT JOIN usuarios_cuentas u ON u.legacy_wp_user_id=r.user_id
         WHERE 1=1 ${userFilter.replaceAll('p.', 'u.')}
           ${membershipFilter(filters, 'u.id', 'u.legacy_wp_user_id')}`,
        values,
      ),
    ]);
    // `modernDays` ya contiene exactamente el rango solicitado. Antes se
    // volvía a leer el historial completo de todos los usuarios para calcular
    // rachas, una consulta inviable al crecer a millones de cuentas.
    const allModernDates = modernDays;
    const modernGrouped = new Map<string, Row[]>();
    for (const day of allModernDates) modernGrouped.set(String(day.user_key), [...(modernGrouped.get(String(day.user_key)) ?? []), day]);
    const modernStreaks = [...modernGrouped.entries()].map(([userKey, days]) => {
      const streak = streakForDates(days.map((day) => day.activity_date));
      return {
        user_key: userKey,
        display_name: days[0].display_name,
        email: days[0].email,
        total_days: streak.total,
        current_streak: streak.current,
        best_streak: streak.best,
        last_activity: streak.last,
      };
    });
    const streaks = [...legacyStreaks, ...modernStreaks]
      .sort((left, right) => normalizedNumber(right.current_streak) - normalizedNumber(left.current_streak)
        || normalizedNumber(right.best_streak) - normalizedNumber(left.best_streak))
      .slice(0, 30);
    const activeDays = [...legacyDays, ...modernDays];
    const dailyMap = new Map<string, { date: string; users: Set<string>; visits: number }>();
    for (const day of activeDays) {
      const date = String(day.activity_date);
      const current = dailyMap.get(date) ?? { date, users: new Set(), visits: 0 };
      current.users.add(String(day.user_key));
      current.visits += normalizedNumber(day.visitas);
      dailyMap.set(date, current);
    }
    const status = { green: 0, yellow: 0, red: 0 };
    for (const item of progress) status[String(item.status).toLowerCase() as keyof typeof status] += 1;
    for (const streak of streaks) {
      const user = userMap.get(String(streak.user_key));
      if (user) {
        user.current_streak = streak.current_streak;
        user.best_streak = streak.best_streak;
      }
    }
    const stats: Record<string, number> = {
      users: new Set(progress.map((item) => String(item.user_key))).size,
      progress: progress.length,
      ...status,
      active_days: activeDays.length,
      visits: activeDays.reduce((sum, day) => sum + normalizedNumber(day.visitas), 0),
      average_streak: streaks.length ? Math.round(streaks.reduce((sum, item) => sum + normalizedNumber(item.current_streak), 0) / streaks.length * 10) / 10 : 0,
      best_streak: Math.max(0, ...streaks.map((item) => normalizedNumber(item.best_streak))),
    };
    const capsuleRows = capsuleCatalog.map((capsule) => ({
      ...capsule,
      ...(topCapsuleMap.get(String(capsule.capsule_id)) ?? {
        responses: 0, green: 0, yellow: 0, red: 0, last_activity: null,
      }),
    }));
    const rankedCapsules = [...capsuleRows].sort((left, right) => (
      normalizedNumber(right.responses) - normalizedNumber(left.responses)
      || String(left.title).localeCompare(String(right.title))
    ));
    stats.total_capsules = capsuleRows.length;
    stats.used_capsules = capsuleRows.filter((item) => normalizedNumber(item.responses) > 0).length;
    stats.unused_capsules = capsuleRows.filter((item) => normalizedNumber(item.responses) === 0).length;
    return {
      period: { from: filters.from, to: filters.to },
      stats,
      topCapsules: rankedCapsules.slice(0, 20),
      leastUsedCapsules: [...capsuleRows].sort((left, right) => (
        normalizedNumber(left.responses) - normalizedNumber(right.responses)
        || String(left.title).localeCompare(String(right.title))
      )).slice(0, 20),
      unusedCapsules: capsuleRows.filter((item) => normalizedNumber(item.responses) === 0),
      capsuleRows,
      topUsers: [...userMap.values()].sort((a, b) => normalizedNumber(b.capsules) - normalizedNumber(a.capsules)).slice(0, 30),
      recent: [...progress].sort((a, b) => String(b.activity_at).localeCompare(String(a.activity_at))).slice(0, 60),
      daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({ date: item.date, users: item.users.size, visits: item.visits })),
      streaks,
      byScholarship: [...scholarshipMap.values()].map((item) => ({
        level_id: item.level_id, name: item.name, users: item.users.size, interactions: item.interactions,
      })).sort((left, right) => left.level_id - right.level_id),
    };
  }

}
