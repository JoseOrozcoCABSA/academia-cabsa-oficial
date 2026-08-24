/**
 * @file Consultas agregadas del panel de analitica.
 *
 * Son cuentas y agrupaciones sobre el historico completo, sin filtro de fechas ni
 * cache. Es la parte del servicio que mas crecera con el volumen de eventos.
 */

import { fn, col, Op, QueryTypes } from 'sequelize';
import database from '#config/database';
import Events from '#models/CabsaAiAssistantEvents';
import ActiveDays from '#models/CabsaDiasActivos';
import Streaks from '#models/CabsaRachas';

/** Consultas agregadas del panel. */
export class DashboardRepository {
  /** Navegación pública agregada; nunca devuelve IP, hash de sesión ni identidad. */
  async publicVisitors() {
    const [totalsRows, sections, actions, daily, devices] = await Promise.all([
      database.query<{
        visitors: number | string; views: number | string; clicks: number | string;
        interested_visitors: number | string;
      }>(
        `SELECT COUNT(DISTINCT session_hash) visitors,
          SUM(event_type='PAGE_VIEW') views,SUM(event_type='CLICK') clicks,
          COUNT(DISTINCT CASE WHEN event_type='CLICK' AND (
            LOWER(COALESCE(action,'')) REGEXP 'registro|inscrib|beca|curso|soporte|contact|iniciar sesi'
          ) THEN session_hash END) interested_visitors
         FROM analitica_eventos_plataforma
         WHERE account_id IS NULL AND created_at>=NOW()-INTERVAL 30 DAY`,
        { type: QueryTypes.SELECT },
      ),
      database.query<Record<string, unknown>>(
        `SELECT section,SUM(event_type='PAGE_VIEW') views,SUM(event_type='CLICK') clicks,
          COUNT(DISTINCT session_hash) visitors,MAX(created_at) last_activity
         FROM analitica_eventos_plataforma
         WHERE account_id IS NULL AND created_at>=NOW()-INTERVAL 30 DAY
         GROUP BY section ORDER BY visitors DESC,clicks DESC LIMIT 20`,
        { type: QueryTypes.SELECT },
      ),
      database.query<Record<string, unknown>>(
        `SELECT action,section,COUNT(*) clicks,COUNT(DISTINCT session_hash) visitors
         FROM analitica_eventos_plataforma
         WHERE account_id IS NULL AND event_type='CLICK' AND action IS NOT NULL
           AND created_at>=NOW()-INTERVAL 30 DAY
         GROUP BY action,section ORDER BY clicks DESC,visitors DESC LIMIT 25`,
        { type: QueryTypes.SELECT },
      ),
      database.query<Record<string, unknown>>(
        `SELECT DATE(created_at) day,COUNT(DISTINCT session_hash) visitors,
          SUM(event_type='PAGE_VIEW') views,SUM(event_type='CLICK') clicks
         FROM analitica_eventos_plataforma
         WHERE account_id IS NULL AND created_at>=NOW()-INTERVAL 30 DAY
         GROUP BY DATE(created_at) ORDER BY day`,
        { type: QueryTypes.SELECT },
      ),
      database.query<Record<string, unknown>>(
        `SELECT device,COUNT(DISTINCT session_hash) visitors
         FROM analitica_eventos_plataforma
         WHERE account_id IS NULL AND created_at>=NOW()-INTERVAL 30 DAY
         GROUP BY device ORDER BY visitors DESC`,
        { type: QueryTypes.SELECT },
      ),
    ]);
    const numeric = (rows: Array<Record<string, unknown>>) => rows.map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => (
        ['views', 'clicks', 'visitors'].includes(key) ? [key, Number(value || 0)] : [key, value]
      )),
    ));
    const totals = totalsRows[0] ?? { visitors: 0, views: 0, clicks: 0, interested_visitors: 0 };
    return {
      periodDays: 30,
      totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Number(value || 0)])),
      sections: numeric(sections), actions: numeric(actions), daily: numeric(daily), devices: numeric(devices),
    };
  }

  /**
   * Totales y desgloses del panel, en cinco consultas en paralelo.
   *
   * Son cuentas sobre la tabla completa, sin filtro de fechas, asi que el coste
   * crece con el historico: conviene vigilarlo cuando la tabla de eventos sea
   * grande, o cachear el resultado.
   */
  async summary() {
    const [events, activeUsers, activeDays, streaks, byType, byArea, scholarshipPeople, sectionClicks] = await Promise.all([
      Events.count(),
      Events.count({ distinct: true, col: 'user_id' }),
      ActiveDays.count(),
      Streaks.count(),
      Events.findAll({
        attributes: ['event_type', [fn('COUNT', col('id')), 'total']],
        group: ['event_type'],
        raw: true,
      }),
      Events.findAll({
        attributes: ['area', [fn('COUNT', col('id')), 'total']],
        group: ['area'],
        raw: true,
      }),
      database.query<{
        level_id: number | string; scholarship_type: string;
        beneficiaries: number | string; active_30_days: number | string;
        viewers_30_days: number | string; events_30_days: number | string;
      }>(
        `SELECT levels.level_id,levels.scholarship_type,
          COUNT(DISTINCT memberships.user_id) beneficiaries,
          COUNT(DISTINCT CASE WHEN u.last_login_at >= NOW() - INTERVAL 30 DAY THEN u.id END) active_30_days,
          COUNT(DISTINCT e.account_id) viewers_30_days,
          COUNT(e.id) events_30_days
         FROM (
           SELECT id level_id,name scholarship_type
           FROM usuarios_niveles_membresia
         ) levels
         LEFT JOIN (
           SELECT DISTINCT a.user_id,a.nivel_membresia_id level_id
           FROM usuarios_activaciones_becas a
           WHERE a.suspended_at IS NULL
             AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())
           UNION
           SELECT DISTINCT c.id user_id,m.membership_id level_id
           FROM usuarios_membresias m
           INNER JOIN usuarios_cuentas c ON c.legacy_wp_user_id=m.user_id
           WHERE m.status='active'
             AND (m.enddate IS NULL OR m.enddate>=NOW())
         ) memberships ON memberships.level_id=levels.level_id
         LEFT JOIN usuarios_cuentas u ON u.id=memberships.user_id
         LEFT JOIN analitica_eventos_plataforma e
           ON e.account_id=u.id AND e.created_at >= NOW() - INTERVAL 30 DAY
         GROUP BY levels.level_id,levels.scholarship_type
         ORDER BY levels.scholarship_type,levels.level_id`,
        { type: QueryTypes.SELECT },
      ),
      database.query<{
        section: string; views: number | string; clicks: number | string;
        people: number | string; last_activity: Date | string;
      }>(
        `SELECT section,
          SUM(event_type='PAGE_VIEW') views,
          SUM(event_type='CLICK') clicks,
          COUNT(DISTINCT session_hash) people,
          MAX(created_at) last_activity
         FROM analitica_eventos_plataforma
         WHERE created_at >= NOW() - INTERVAL 30 DAY
         GROUP BY section
         ORDER BY clicks DESC, views DESC
         LIMIT 20`,
        { type: QueryTypes.SELECT },
      ),
    ]);
    const scholarshipKey = (levelId: number) => ({
      6: 'teachers',
      8: 'familyStudents',
      11: 'cabsaStaff',
    }[levelId] ?? `level${levelId}`);
    const normalizedScholarshipPeople = Object.fromEntries(scholarshipPeople.map((row) => [
      scholarshipKey(Number(row.level_id)),
      {
        levelId: Number(row.level_id),
        name: row.scholarship_type,
        beneficiaries: Number(row.beneficiaries || 0),
        active30Days: Number(row.active_30_days || 0),
        viewers30Days: Number(row.viewers_30_days || 0),
        events30Days: Number(row.events_30_days || 0),
      },
    ]));
    return {
      totals: { events, activeUsers, activeDays, streaks },
      peopleByScholarship: {
        teachers: normalizedScholarshipPeople.teachers
          ?? { levelId: 6, name: 'Docente', beneficiaries: 0, active30Days: 0, viewers30Days: 0, events30Days: 0 },
        familyStudents: normalizedScholarshipPeople.familyStudents
          ?? { levelId: 8, name: 'Familia estudiante', beneficiaries: 0, active30Days: 0, viewers30Days: 0, events30Days: 0 },
        cabsaStaff: normalizedScholarshipPeople.cabsaStaff
          ?? { levelId: 11, name: 'Personal CABSA', beneficiaries: 0, active30Days: 0, viewers30Days: 0, events30Days: 0 },
      },
      scholarshipProfiles: scholarshipPeople.map((row) => ({
        levelId: Number(row.level_id),
        name: row.scholarship_type,
        beneficiaries: Number(row.beneficiaries || 0),
        active30Days: Number(row.active_30_days || 0),
        viewers30Days: Number(row.viewers_30_days || 0),
        events30Days: Number(row.events_30_days || 0),
      })),
      sectionClicks: sectionClicks.map((row) => ({
        ...row,
        views: Number(row.views || 0),
        clicks: Number(row.clicks || 0),
        people: Number(row.people || 0),
      })),
      byType,
      byArea,
    };
  }

  /** Actividad diaria real de los ultimos siete dias, incluyendo dias en cero. */
  async eventsReport() {
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    const firstDay = new Date(today);
    firstDay.setUTCDate(today.getUTCDate() - 6);
    firstDay.setUTCHours(0, 0, 0, 0);
    const rows = await Events.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'day'],
        [fn('COUNT', col('id')), 'total'],
      ],
      where: { created_at: { [Op.gte]: firstDay } },
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    }) as unknown as Array<{ day: string | Date; total: string | number }>;
    const totals = new Map(rows.map((row) => [
      new Date(row.day).toISOString().slice(0, 10),
      Number(row.total),
    ]));
    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(firstDay);
      date.setUTCDate(firstDay.getUTCDate() + index);
      const day = date.toISOString().slice(0, 10);
      return { day, total: totals.get(day) ?? 0 };
    });
    return {
      period: {
        from: daily[0].day,
        to: daily[daily.length - 1].day,
        days: daily.length,
      },
      total: daily.reduce((sum, item) => sum + item.total, 0),
      daily,
    };
  }
}

/** Instancia de `DashboardRepository` lista para usar. */
export default new DashboardRepository();
