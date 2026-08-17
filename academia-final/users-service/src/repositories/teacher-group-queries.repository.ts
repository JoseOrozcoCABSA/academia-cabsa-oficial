import { QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';
import type { ManagedGroup, SponsorPolicy } from './teacher-groups.types.js';

interface GroupPage {
  limit: number;
  offset: number;
  search: string;
}

const effectiveSeatLimitSql = `CASE
  WHEN NOT EXISTS (SELECT 1 FROM usuarios_gestores_grupos owner WHERE owner.grupo_id=g.id)
    THEN 30
  WHEN EXISTS (
    SELECT 1 FROM usuarios_gestores_grupos owner
    INNER JOIN usuarios_activaciones_becas sponsor ON sponsor.user_id=owner.docente_user_id
    INNER JOIN usuarios_reglas_dependientes_becas rule
      ON rule.nivel_patrocinador_id=sponsor.nivel_membresia_id AND rule.activa=1
    WHERE owner.grupo_id=g.id AND sponsor.suspended_at IS NULL
      AND (sponsor.vigente_hasta IS NULL OR sponsor.vigente_hasta>=CURDATE())
  ) THEN (SELECT owner.limite_lugares FROM usuarios_gestores_grupos owner
          WHERE owner.grupo_id=g.id ORDER BY owner.creado_en LIMIT 1)
  ELSE 0 END`;

export class TeacherGroupQueriesRepository {
  async authorization(userId: string) {
    const records = await database.query<{ code: string }>(
      `SELECT r.code
       FROM usuarios_asignaciones_roles ur
       INNER JOIN usuarios_roles r ON r.id=ur.role_id
       WHERE ur.user_id=:userId`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
    const roles = records.map((record) => record.code);
    const policies = await database.query<SponsorPolicy>(
      `SELECT a.id AS sponsor_activation_id,r.nivel_patrocinador_id AS sponsor_level_id,
              r.nivel_dependiente_id AS dependent_level_id,
              sponsor.name AS sponsor_name,dependent.name AS dependent_name,
              r.etiqueta_dependiente AS dependent_label,
              r.limite_lugares AS seat_limit,r.hereda_vigencia AS inherit_expiry,
              r.permite_seguimiento AS allow_progress,a.vigente_hasta
       FROM usuarios_activaciones_becas a
       INNER JOIN usuarios_reglas_dependientes_becas r
         ON r.nivel_patrocinador_id=a.nivel_membresia_id AND r.activa=1
       INNER JOIN usuarios_niveles_membresia sponsor ON sponsor.id=r.nivel_patrocinador_id
       INNER JOIN usuarios_niveles_membresia dependent ON dependent.id=r.nivel_dependiente_id
       WHERE a.user_id=:userId AND a.suspended_at IS NULL
         AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())
       ORDER BY a.activado_en DESC LIMIT 1`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
    return {
      isAdmin: roles.includes('ADMIN'),
      isTeacher: roles.includes('TEACHER'),
      sponsorPolicy: policies[0] ?? null,
    };
  }

  /** Provisión idempotente para becas antiguas a las que después se agrega una regla. */
  async ensureSponsorGroup(userId: string, policy: SponsorPolicy) {
    return database.transaction(async (transaction) => {
      const accounts = await database.query<{ display_name: string }>(
        'SELECT display_name FROM usuarios_cuentas WHERE id=:userId LIMIT 1 FOR UPDATE',
        { replacements: { userId }, type: QueryTypes.SELECT, transaction },
      );
      const existing = await database.query<{ grupo_id: number }>(
        'SELECT grupo_id FROM usuarios_gestores_grupos WHERE docente_user_id=:userId LIMIT 1',
        { replacements: { userId }, type: QueryTypes.SELECT, transaction },
      );
      if (existing[0]) {
        await database.query(
          `UPDATE usuarios_gestores_grupos SET limite_lugares=:seatLimit,actualizado_en=NOW()
           WHERE docente_user_id=:userId`,
          { replacements: { userId, seatLimit: policy.seat_limit }, type: QueryTypes.UPDATE, transaction },
        );
        return existing[0].grupo_id;
      }
      const displayName = accounts[0]?.display_name || policy.sponsor_name;
      const [groupId] = await database.query(
        `INSERT INTO usuarios_grupos
          (nombre,descripcion,clave_estado,estado,clave_municipio,municipio,
           creado_por_wp_user_id,creado_en,actualizado_en)
         VALUES(:name,:description,'','','','',0,NOW(),NOW())`,
        {
          replacements: {
            name: `Grupo de ${displayName} · ${userId.slice(0, 8)}`.slice(0, 190),
            description: policy.sponsor_name,
          },
          type: QueryTypes.INSERT,
          transaction,
        },
      );
      await database.query(
        `INSERT INTO usuarios_gestores_grupos
          (grupo_id,docente_user_id,limite_lugares,creado_en,actualizado_en)
         VALUES(:groupId,:userId,:seatLimit,NOW(),NOW())`,
        {
          replacements: { groupId, userId, seatLimit: policy.seat_limit },
          type: QueryTypes.INSERT,
          transaction,
        },
      );
      return Number(groupId);
    });
  }

  async groupsFor(
    userId: string,
    isAdmin: boolean,
    page: GroupPage,
  ): Promise<{ groups: ManagedGroup[]; total: number }> {
    const searchClause = page.search ? 'AND g.nombre LIKE :search' : '';
    const replacements = {
      userId,
      isAdmin: isAdmin ? 1 : 0,
      search: `%${page.search}%`,
      limit: page.limit,
      offset: page.offset,
    };
    const groups = await database.query<ManagedGroup>(
      `SELECT g.id, g.nombre, g.descripcion,
              ${effectiveSeatLimitSql} AS seat_limit,
              (
                SELECT COUNT(*)
                FROM (
                  SELECT gc.user_id
                  FROM usuarios_grupos_cuentas gc
                  WHERE gc.grupo_id=g.id AND gc.estado='ACTIVE'
                  UNION
                  SELECT c.id
                  FROM usuarios_miembros_grupos mg
                  INNER JOIN usuarios_cuentas c
                    ON c.legacy_official_user_id=mg.usuario_oficial_id
                  WHERE mg.grupo_id=g.id AND c.status='ACTIVE'
                    AND NOT EXISTS (
                      SELECT 1 FROM usuarios_grupos_cuentas removed
                      WHERE removed.grupo_id=g.id AND removed.user_id=c.id
                        AND removed.estado='REMOVED'
                    )
                ) seats
              ) AS occupied_seats
       FROM usuarios_grupos g
       LEFT JOIN usuarios_gestores_grupos gg
         ON gg.grupo_id=g.id AND gg.docente_user_id=:userId
       WHERE ((:isAdmin) = 1 OR gg.docente_user_id IS NOT NULL)
       ${searchClause}
       ORDER BY g.nombre
       LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );
    const totals = await database.query<{ total: number }>(
      `SELECT COUNT(*) total
       FROM usuarios_grupos g
       LEFT JOIN usuarios_gestores_grupos gg
         ON gg.grupo_id=g.id AND gg.docente_user_id=:userId
       WHERE ((:isAdmin) = 1 OR gg.docente_user_id IS NOT NULL)
       ${searchClause}`,
      { replacements, type: QueryTypes.SELECT },
    );
    return { groups, total: Number(totals[0]?.total ?? 0) };
  }

  async canManageGroup(groupId: number, userId: string, isAdmin: boolean) {
    const rows = await database.query<{ allowed: number }>(
      `SELECT 1 allowed
       FROM usuarios_grupos g
       LEFT JOIN usuarios_gestores_grupos gg
         ON gg.grupo_id=g.id AND gg.docente_user_id=:userId
       WHERE g.id=:groupId AND ((:isAdmin) = 1 OR gg.docente_user_id IS NOT NULL)
       LIMIT 1`,
      {
        replacements: { groupId, userId, isAdmin: isAdmin ? 1 : 0 },
        type: QueryTypes.SELECT,
      },
    );
    return Boolean(rows[0]?.allowed);
  }

  async students(groupId: number) {
    return database.query(
      `WITH membership_sources AS (
         SELECT gc.user_id, 'DOCENTE' AS source
         FROM usuarios_grupos_cuentas gc
         WHERE gc.grupo_id=:groupId AND gc.estado<>'REMOVED'
         UNION ALL
         SELECT c.id, 'HISTORICO' AS source
         FROM usuarios_miembros_grupos mg
         INNER JOIN usuarios_cuentas c
           ON c.legacy_official_user_id=mg.usuario_oficial_id
         WHERE mg.grupo_id=:groupId
           AND NOT EXISTS (
             SELECT 1 FROM usuarios_grupos_cuentas removed
             WHERE removed.grupo_id=:groupId AND removed.user_id=c.id
               AND removed.estado='REMOVED'
           )
       ),
       membership AS (
         SELECT user_id,
                IF(SUM(source='DOCENTE')>0,'DOCENTE','HISTORICO') AS source
         FROM membership_sources
         GROUP BY user_id
       ),
       course_stats AS (
         SELECT i.user_id, COUNT(*) AS courses,
                SUM(i.status='COMPLETED') AS completed_courses,
                ROUND(AVG(i.progress_percent), 1) AS course_progress,
                MAX(i.updated_at) AS last_activity
         FROM academia_inscripciones i
         INNER JOIN membership m ON m.user_id=i.user_id
         GROUP BY i.user_id
       ),
       lesson_stats AS (
         SELECT i.user_id,COUNT(*) AS lessons,
                SUM(lp.status='COMPLETED') AS completed_lessons,
                MAX(lp.updated_at) AS last_activity
         FROM academia_progreso_lecciones lp
         INNER JOIN academia_inscripciones i ON i.id=lp.enrollment_id
         INNER JOIN membership m ON m.user_id=i.user_id
         GROUP BY i.user_id
       ),
       capsule_stats AS (
         SELECT p.user_id, COUNT(*) AS capsules,
                SUM(p.semaphore_status='GREEN') AS green_capsules,
                SUM(p.semaphore_status='YELLOW') AS yellow_capsules,
                SUM(p.semaphore_status='RED') AS red_capsules,
                MAX(p.updated_at) AS last_activity
         FROM analitica_progreso_capsulas p
         INNER JOIN membership m ON m.user_id=p.user_id
         GROUP BY p.user_id
       ),
       forum_stats AS (
         SELECT activity.user_id,COUNT(*) AS contributions,MAX(activity.created_at) AS last_activity
         FROM (
           SELECT author_id user_id,created_at FROM academia_foro_temas
           UNION ALL
           SELECT author_id user_id,created_at FROM academia_foro_respuestas
         ) activity
         INNER JOIN membership m ON m.user_id=activity.user_id
         GROUP BY activity.user_id
       )
       SELECT s.id, s.email, s.username, s.display_name, s.status,
               s.created_at, membership.source,
               EXISTS(
                 SELECT 1 FROM usuarios_activaciones_becas a
                 WHERE a.user_id=s.id AND a.nivel_membresia_id=COALESCE((
                   SELECT rule.nivel_dependiente_id
                   FROM usuarios_gestores_grupos manager
                   INNER JOIN usuarios_activaciones_becas sponsor_activation
                     ON sponsor_activation.user_id=manager.docente_user_id
                     AND sponsor_activation.suspended_at IS NULL
                     AND (sponsor_activation.vigente_hasta IS NULL OR sponsor_activation.vigente_hasta>=CURDATE())
                   INNER JOIN usuarios_reglas_dependientes_becas rule
                     ON rule.nivel_patrocinador_id=sponsor_activation.nivel_membresia_id AND rule.activa=1
                   WHERE manager.grupo_id=:groupId LIMIT 1
                 ),8)
                   AND a.suspended_at IS NULL
                   AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())
                   AND (a.patrocinador_activacion_id IS NULL OR EXISTS (
                     SELECT 1 FROM usuarios_activaciones_becas sponsor
                     WHERE sponsor.id=a.patrocinador_activacion_id
                       AND sponsor.suspended_at IS NULL
                       AND (sponsor.vigente_hasta IS NULL OR sponsor.vigente_hasta>=CURDATE())
                   ))
               ) AS scholarship_active,
               (SELECT MAX(a.vigente_hasta) FROM usuarios_activaciones_becas a
                WHERE a.user_id=s.id AND a.nivel_membresia_id=COALESCE((
                  SELECT rule.nivel_dependiente_id
                  FROM usuarios_gestores_grupos manager
                  INNER JOIN usuarios_activaciones_becas sponsor_activation
                    ON sponsor_activation.user_id=manager.docente_user_id
                  INNER JOIN usuarios_reglas_dependientes_becas rule
                    ON rule.nivel_patrocinador_id=sponsor_activation.nivel_membresia_id AND rule.activa=1
                  WHERE manager.grupo_id=:groupId LIMIT 1
                ),8)) AS scholarship_expires,
              COALESCE(course_stats.courses, 0) AS courses,
              COALESCE(course_stats.completed_courses, 0) AS completed_courses,
              COALESCE(course_stats.course_progress, 0) AS course_progress,
              COALESCE(lesson_stats.lessons, 0) AS lessons,
              COALESCE(lesson_stats.completed_lessons, 0) AS completed_lessons,
              COALESCE(capsule_stats.capsules, 0) AS capsules,
              COALESCE(capsule_stats.green_capsules, 0) AS green_capsules,
              COALESCE(capsule_stats.yellow_capsules, 0) AS yellow_capsules,
              COALESCE(capsule_stats.red_capsules, 0) AS red_capsules,
              COALESCE(forum_stats.contributions, 0) AS forum_contributions,
              GREATEST(
                COALESCE(course_stats.last_activity, '1900-01-01'),
                COALESCE(lesson_stats.last_activity, '1900-01-01'),
                COALESCE(capsule_stats.last_activity, '1900-01-01'),
                COALESCE(forum_stats.last_activity, '1900-01-01'),
                COALESCE(s.last_login_at, '1900-01-01')
              ) AS last_activity
       FROM membership
       INNER JOIN usuarios_cuentas s ON s.id=membership.user_id
       LEFT JOIN course_stats ON course_stats.user_id=s.id
       LEFT JOIN lesson_stats ON lesson_stats.user_id=s.id
       LEFT JOIN capsule_stats ON capsule_stats.user_id=s.id
       LEFT JOIN forum_stats ON forum_stats.user_id=s.id
       ORDER BY s.display_name, s.email`,
      { replacements: { groupId }, type: QueryTypes.SELECT },
    );
  }

  async groupHistory(groupId: number) {
    return database.query(
      `SELECT h.id,h.student_user_id,h.event_type,h.previous_status,h.new_status,
              h.student_name,h.student_email,h.details,h.created_at,
              COALESCE(NULLIF(actor.display_name,''),actor.username,actor.email,'Sistema') performed_by,
              gc.estado current_group_status
       FROM usuarios_historial_miembros_grupos h
       LEFT JOIN usuarios_cuentas actor ON actor.id=h.performed_by_user_id
       LEFT JOIN usuarios_grupos_cuentas gc
         ON gc.grupo_id=h.grupo_id AND gc.user_id=h.student_user_id
       WHERE h.grupo_id=:groupId
       ORDER BY h.created_at DESC,h.id DESC`,
      { replacements: { groupId }, type: QueryTypes.SELECT },
    );
  }

  async lockManagedGroup(
    groupId: number,
    userId: string,
    isAdmin: boolean,
    transaction: Transaction,
  ) {
    const records = await database.query<ManagedGroup>(
      `SELECT g.id, g.nombre, g.descripcion,
              ${effectiveSeatLimitSql} AS seat_limit,
              (
                SELECT COUNT(*)
                FROM (
                  SELECT gc.user_id FROM usuarios_grupos_cuentas gc
                  WHERE gc.grupo_id=g.id AND gc.estado='ACTIVE'
                  UNION
                  SELECT c.id FROM usuarios_miembros_grupos mg
                  INNER JOIN usuarios_cuentas c
                    ON c.legacy_official_user_id=mg.usuario_oficial_id
                  WHERE mg.grupo_id=g.id AND c.status='ACTIVE'
                    AND NOT EXISTS (
                      SELECT 1 FROM usuarios_grupos_cuentas removed
                      WHERE removed.grupo_id=g.id AND removed.user_id=c.id
                        AND removed.estado='REMOVED'
                    )
                ) seats
              ) AS occupied_seats
       FROM usuarios_grupos g
       LEFT JOIN usuarios_gestores_grupos gg
         ON gg.grupo_id=g.id AND gg.docente_user_id=:userId
       WHERE g.id=:groupId AND ((:isAdmin) = 1 OR gg.docente_user_id IS NOT NULL)
       FOR UPDATE`,
      {
        replacements: { groupId, userId, isAdmin: isAdmin ? 1 : 0 },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    return records[0] ?? null;
  }

}
