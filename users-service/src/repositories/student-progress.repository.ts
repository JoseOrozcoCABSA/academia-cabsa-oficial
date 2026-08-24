import { QueryTypes } from 'sequelize';
import database from '#config/database';

type Row = Record<string, unknown>;

export class StudentProgressRepository {
  async report(groupId: number, studentId: string) {
    const student = await database.query<Row>(
      `WITH membership AS (
         SELECT gc.user_id, 'DOCENTE' source
         FROM usuarios_grupos_cuentas gc
         WHERE gc.grupo_id=:groupId AND gc.user_id=:studentId AND gc.estado<>'REMOVED'
         UNION ALL
         SELECT c.id, 'HISTORICO' source
         FROM usuarios_miembros_grupos mg
         INNER JOIN usuarios_cuentas c ON c.legacy_official_user_id=mg.usuario_oficial_id
         WHERE mg.grupo_id=:groupId AND c.id=:studentId
           AND NOT EXISTS (
             SELECT 1 FROM usuarios_grupos_cuentas removed
             WHERE removed.grupo_id=:groupId AND removed.user_id=c.id AND removed.estado='REMOVED'
           )
       )
       SELECT c.id,c.display_name,c.email,c.username,c.status,c.created_at,c.last_login_at,
              g.id group_id,g.nombre group_name,
              IF(SUM(m.source='DOCENTE')>0,'DOCENTE','HISTORICO') source
       FROM membership m
       INNER JOIN usuarios_cuentas c ON c.id=m.user_id
       INNER JOIN usuarios_grupos g ON g.id=:groupId
       GROUP BY c.id,c.display_name,c.email,c.username,c.status,c.created_at,c.last_login_at,g.id,g.nombre`,
      { replacements: { groupId, studentId }, type: QueryTypes.SELECT },
    );
    if (!student[0]) return null;

    const replacements = { studentId };
    const [courses, lessons, learning, recentActivity, capsules, platformRows, platformSections, forumRows, forumActivity] = await Promise.all([
      database.query<Row>(
        `SELECT e.id enrollment_id,c.id,c.title,c.slug,e.status,
                e.progress_percent,e.enrolled_at,e.completed_at,e.updated_at last_activity
         FROM academia_inscripciones e
         INNER JOIN academia_cursos c ON c.id=e.course_id
         WHERE e.user_id=:studentId
         ORDER BY e.updated_at DESC,c.title`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<Row>(
        `SELECT e.id enrollment_id,c.id course_id,l.id,l.number,l.title,l.module,l.lesson_type,
                COALESCE(lp.status,'NOT_STARTED') status,
                COALESCE(lp.progress_percent,0) progress_percent,
                lp.started_at,lp.completed_at,lp.updated_at last_activity,
                COALESCE(rt.accumulated_seconds,0) study_seconds,
                ex.id exam_id,ex.title exam_title,ex.passing_score,
                COUNT(ea.id) exam_attempts,MAX(ea.score) best_score,
                MAX(CASE WHEN ea.passed=1 THEN 1 ELSE 0 END) exam_passed,
                MAX(ea.submitted_at) last_exam_at
         FROM academia_inscripciones e
         INNER JOIN academia_cursos c ON c.id=e.course_id
         INNER JOIN academia_lecciones l ON l.course_id=c.id
         LEFT JOIN academia_progreso_lecciones lp ON lp.enrollment_id=e.id AND lp.lesson_id=l.id
         LEFT JOIN academia_tiempo_lectura rt ON rt.user_id=e.user_id AND rt.lesson_id=l.id
         LEFT JOIN academia_examenes ex ON ex.lesson_id=l.id AND ex.status='PUBLISHED'
         LEFT JOIN academia_examen_intentos ea ON ea.exam_id=ex.id AND ea.user_id=e.user_id
         WHERE e.user_id=:studentId
         GROUP BY e.id,c.id,l.id,l.number,l.title,l.module,l.lesson_type,lp.status,
                  lp.progress_percent,lp.started_at,lp.completed_at,lp.updated_at,
                  rt.accumulated_seconds,ex.id,ex.title,ex.passing_score
         ORDER BY c.title,l.number,l.id`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<Row>(
        `SELECT
           (SELECT COUNT(*) FROM contenido_capsulas WHERE status='published') total_capsules,
           (SELECT COUNT(*) FROM analitica_progreso_capsulas p INNER JOIN contenido_capsulas c ON c.id=p.capsule_id WHERE p.user_id=:studentId AND c.status='published') capsules,
           (SELECT COUNT(*) FROM analitica_progreso_capsulas p INNER JOIN contenido_capsulas c ON c.id=p.capsule_id WHERE p.user_id=:studentId AND c.status='published' AND p.semaphore_status='GREEN') green_capsules,
           (SELECT COUNT(*) FROM analitica_progreso_capsulas p INNER JOIN contenido_capsulas c ON c.id=p.capsule_id WHERE p.user_id=:studentId AND c.status='published' AND p.semaphore_status='YELLOW') yellow_capsules,
           (SELECT COUNT(*) FROM analitica_progreso_capsulas p INNER JOIN contenido_capsulas c ON c.id=p.capsule_id WHERE p.user_id=:studentId AND c.status='published' AND p.semaphore_status='RED') red_capsules,
           (SELECT COALESCE(SUM(points),0) FROM analitica_eventos_xp WHERE user_id=:studentId) xp,
           (SELECT COUNT(*) FROM analitica_actividad_aprendizaje WHERE user_id=:studentId) active_days,
           (SELECT MAX(last_activity_at) FROM analitica_actividad_aprendizaje WHERE user_id=:studentId) last_learning_activity`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<Row>(
        `(SELECT 'LESSON' activity_type,lp.updated_at activity_at,c.title course_title,
                 l.title item_title,lp.status detail,lp.progress_percent value
          FROM academia_progreso_lecciones lp
          INNER JOIN academia_inscripciones e ON e.id=lp.enrollment_id
          INNER JOIN academia_cursos c ON c.id=e.course_id
          INNER JOIN academia_lecciones l ON l.id=lp.lesson_id
          WHERE e.user_id=:studentId)
         UNION ALL
         (SELECT 'EXAM',ea.submitted_at,c.title,l.title,
                 IF(ea.passed=1,'PASSED','NOT_PASSED'),ea.score
          FROM academia_examen_intentos ea
          INNER JOIN academia_examenes ex ON ex.id=ea.exam_id
          INNER JOIN academia_lecciones l ON l.id=ex.lesson_id
          INNER JOIN academia_cursos c ON c.id=l.course_id
          WHERE ea.user_id=:studentId)
         UNION ALL
         (SELECT 'XP',xp.earned_at,c.title,xp.description,xp.event_type,xp.points
          FROM analitica_eventos_xp xp
          INNER JOIN academia_cursos c ON c.id=xp.course_id
          WHERE xp.user_id=:studentId)
         ORDER BY activity_at DESC LIMIT 40`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<Row>(
        `SELECT c.id,c.title,c.slug,c.category,p.semaphore_status,
                COALESCE(p.progress_percent,0) progress_percent,
                p.completed_at,p.updated_at
         FROM contenido_capsulas c
         INNER JOIN analitica_progreso_capsulas p
           ON p.capsule_id=c.id AND p.user_id=:studentId
         WHERE c.status='published'
         ORDER BY p.updated_at DESC,c.title`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<Row>(
        `SELECT COALESCE(SUM(s.page_views),0) page_views,
                COALESCE(SUM(s.clicks),0) clicks,
                COUNT(*) sessions,
                COUNT(DISTINCT s.activity_date) active_days,
                COALESCE(SUM(s.session_seconds),0) platform_seconds,
                MAX(s.last_event_at) last_platform_activity
         FROM (
           SELECT session_hash,DATE(MIN(created_at)) activity_date,
                  SUM(event_type='PAGE_VIEW') page_views,SUM(event_type='CLICK') clicks,
                  LEAST(14400,GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(created_at),MAX(created_at)))) session_seconds,
                  MAX(created_at) last_event_at
           FROM analitica_eventos_plataforma
           WHERE account_id=:studentId
           GROUP BY session_hash
         ) s`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<Row>(
        `SELECT section,SUM(event_type='PAGE_VIEW') page_views,SUM(event_type='CLICK') clicks,
                COUNT(DISTINCT session_hash) sessions,MAX(created_at) last_activity
         FROM analitica_eventos_plataforma
         WHERE account_id=:studentId
         GROUP BY section
         ORDER BY page_views DESC,clicks DESC,last_activity DESC
         LIMIT 20`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<Row>(
        `SELECT
           (SELECT COUNT(*) FROM academia_foro_temas WHERE author_id=:studentId) topics,
           (SELECT COUNT(*) FROM academia_foro_respuestas WHERE author_id=:studentId) replies,
           (SELECT MAX(activity_at) FROM (
              SELECT created_at activity_at FROM academia_foro_temas WHERE author_id=:studentId
              UNION ALL
              SELECT created_at activity_at FROM academia_foro_respuestas WHERE author_id=:studentId
            ) forum_dates) last_forum_activity`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<Row>(
        `(SELECT 'TOPIC' contribution_type,t.created_at activity_at,f.title forum_title,
                 t.title topic_title,LEFT(t.content,240) content,t.status
          FROM academia_foro_temas t
          INNER JOIN academia_foros f ON f.id=t.forum_id
          WHERE t.author_id=:studentId)
         UNION ALL
         (SELECT 'REPLY',r.created_at,f.title,t.title,LEFT(r.content,240),r.status
          FROM academia_foro_respuestas r
          INNER JOIN academia_foro_temas t ON t.id=r.topic_id
          INNER JOIN academia_foros f ON f.id=r.forum_id
          WHERE r.author_id=:studentId)
         ORDER BY activity_at DESC LIMIT 30`,
        { replacements, type: QueryTypes.SELECT },
      ),
    ]);

    return {
      student: student[0], courses, lessons, learning: learning[0] ?? {}, recentActivity,
      capsules, platform: platformRows[0] ?? {}, platformSections,
      forums: forumRows[0] ?? {}, forumActivity,
    };
  }
}

export default new StudentProgressRepository();
