import { activeMembershipsSql, first, guardedInsert, membershipCondition, membershipFilter, normalizedNumber, range, rows, scholarshipName, secureHash, streakForDates, type Row, type TrackerFilters } from './trackers-query-context.js';

export class CourseTrackersRepository {
  async courses(filters: TrackerFilters) {
    const values: Record<string, unknown> = {
      fromDate: `${filters.from} 00:00:00`,
      toDate: `${filters.to} 23:59:59`,
      userSearch: `%${filters.user ?? ''}%`,
      courseId: filters.courseId || 0,
      scholarshipLevel: filters.scholarshipLevel || 0,
    };
    const courseFilter = filters.courseId ? 'AND c.id=:courseId' : '';
    const userFilter = filters.user
      ? 'AND (u.display_name LIKE :userSearch OR u.email LIKE :userSearch OR u.username LIKE :userSearch)'
      : '';
    const userMembershipFilter = membershipFilter(filters, 'u.id', 'u.legacy_wp_user_id');
    const enrollmentMembershipCondition = membershipCondition(
      filters,
      'e.user_id',
      '(SELECT membership_account.legacy_wp_user_id FROM usuarios_cuentas membership_account WHERE membership_account.id=e.user_id LIMIT 1)',
    );
    const pageViewMembershipFilter = membershipFilter(
      filters,
      'pe.account_id',
      '(SELECT membership_account.legacy_wp_user_id FROM usuarios_cuentas membership_account WHERE membership_account.id=pe.account_id LIMIT 1)',
    );
    const [catalogStats, activityStats, courseRows, lessonRows, userRows, recent, daily, courses, byScholarship] = await Promise.all([
      first<Row>(
        `SELECT COUNT(DISTINCT c.id) courses,COUNT(DISTINCT l.id) lessons
         FROM academia_cursos c LEFT JOIN academia_lecciones l ON l.course_id=c.id
         WHERE c.status='published' ${courseFilter}`,
        values,
      ),
      first<Row>(
        `SELECT COUNT(DISTINCT e.user_id) active_users,COUNT(DISTINCT e.id) participations,
          COUNT(DISTINCT CASE WHEN e.status='COMPLETED' THEN e.id END) completed_courses,
          COUNT(DISTINCT lp.id) lesson_activity,
          SUM(lp.status='COMPLETED') completed_lessons
         FROM academia_inscripciones e
         INNER JOIN academia_cursos c ON c.id=e.course_id
         LEFT JOIN usuarios_cuentas u ON u.id=e.user_id
         LEFT JOIN academia_progreso_lecciones lp ON lp.enrollment_id=e.id
           AND lp.updated_at BETWEEN :fromDate AND :toDate
         WHERE (e.updated_at BETWEEN :fromDate AND :toDate OR lp.id IS NOT NULL)
           ${courseFilter} ${userFilter} ${userMembershipFilter}`,
        values,
      ),
       rows<Row>(
         `SELECT c.id course_id,c.title,c.slug,COUNT(DISTINCT e.user_id) students,
           SUM(e.status='COMPLETED') completed,
           SUM(e.status='ACTIVE') in_progress,ROUND(AVG(e.progress_percent),1) average_progress,
           MAX(e.updated_at) last_activity,
           (SELECT COUNT(*) FROM analitica_eventos_plataforma pe
            WHERE pe.created_at BETWEEN :fromDate AND :toDate
              AND pe.event_type='PAGE_VIEW'
              AND (pe.path=CONCAT('/cursos/',c.slug)
                OR pe.path LIKE CONCAT('/cursos/',c.slug,'?%')
                OR pe.path LIKE CONCAT('/cursos/',c.slug,'/%'))
              ${pageViewMembershipFilter}) page_views,
           (SELECT COUNT(DISTINCT pe.session_hash) FROM analitica_eventos_plataforma pe
            WHERE pe.created_at BETWEEN :fromDate AND :toDate
              AND pe.event_type='PAGE_VIEW'
              AND (pe.path=CONCAT('/cursos/',c.slug)
                OR pe.path LIKE CONCAT('/cursos/',c.slug,'?%')
                OR pe.path LIKE CONCAT('/cursos/',c.slug,'/%'))
              ${pageViewMembershipFilter}) visitors,
           (SELECT MAX(pe.created_at) FROM analitica_eventos_plataforma pe
            WHERE pe.created_at BETWEEN :fromDate AND :toDate
              AND (pe.path=CONCAT('/cursos/',c.slug)
                OR pe.path LIKE CONCAT('/cursos/',c.slug,'?%')
                OR pe.path LIKE CONCAT('/cursos/',c.slug,'/%'))
              ${pageViewMembershipFilter}) last_visit
          FROM academia_cursos c
         LEFT JOIN academia_inscripciones e ON e.course_id=c.id AND e.updated_at BETWEEN :fromDate AND :toDate
           AND ${enrollmentMembershipCondition}
         LEFT JOIN usuarios_cuentas u ON u.id=e.user_id
         WHERE c.status='published' ${courseFilter} ${userFilter}
          GROUP BY c.id,c.title,c.slug
          ORDER BY page_views DESC,students DESC,completed DESC,last_activity DESC`,
        values,
      ),
      rows<Row>(
        `SELECT l.id lesson_id,l.title,c.id course_id,c.title course_title,
          COUNT(DISTINCT e.user_id) students,SUM(lp.status='COMPLETED') completed,
          SUM(lp.status='IN_PROGRESS') in_progress,MAX(lp.updated_at) last_activity
         FROM academia_lecciones l INNER JOIN academia_cursos c ON c.id=l.course_id
         LEFT JOIN academia_progreso_lecciones lp ON lp.lesson_id=l.id AND lp.updated_at BETWEEN :fromDate AND :toDate
         LEFT JOIN academia_inscripciones e ON e.id=lp.enrollment_id
         LEFT JOIN usuarios_cuentas u ON u.id=e.user_id
         WHERE c.status='published' ${courseFilter} ${userFilter} ${userMembershipFilter}
         GROUP BY l.id,l.title,c.id,c.title
         HAVING students>0 ORDER BY students DESC,completed DESC,last_activity DESC LIMIT 40`,
        values,
      ),
      rows<Row>(
        `SELECT u.id user_id,u.display_name,u.email,COUNT(DISTINCT e.course_id) courses,
          COUNT(DISTINCT lp.lesson_id) lessons,SUM(lp.status='COMPLETED') completed,
          MAX(COALESCE(lp.updated_at,e.updated_at)) last_activity
         FROM academia_inscripciones e INNER JOIN usuarios_cuentas u ON u.id=e.user_id
         INNER JOIN academia_cursos c ON c.id=e.course_id
         LEFT JOIN academia_progreso_lecciones lp ON lp.enrollment_id=e.id AND lp.updated_at BETWEEN :fromDate AND :toDate
         WHERE (e.updated_at BETWEEN :fromDate AND :toDate OR lp.id IS NOT NULL)
           ${courseFilter} ${userFilter} ${userMembershipFilter}
         GROUP BY u.id,u.display_name,u.email ORDER BY last_activity DESC,completed DESC LIMIT 40`,
        values,
      ),
      rows<Row>(
        `SELECT lp.id,lp.updated_at activity_at,u.display_name,u.email,c.title course_title,
          l.title lesson_title,lp.status,lp.progress_percent
         FROM academia_progreso_lecciones lp
         INNER JOIN academia_inscripciones e ON e.id=lp.enrollment_id
         INNER JOIN usuarios_cuentas u ON u.id=e.user_id
         INNER JOIN academia_lecciones l ON l.id=lp.lesson_id
         INNER JOIN academia_cursos c ON c.id=e.course_id
         WHERE lp.updated_at BETWEEN :fromDate AND :toDate ${courseFilter} ${userFilter} ${userMembershipFilter}
         ORDER BY lp.updated_at DESC LIMIT 60`,
        values,
      ),
      rows<Row>(
        `SELECT DATE(lp.updated_at) date,COUNT(*) movements,COUNT(DISTINCT e.user_id) users
         FROM academia_progreso_lecciones lp
         INNER JOIN academia_inscripciones e ON e.id=lp.enrollment_id
         INNER JOIN academia_cursos c ON c.id=e.course_id
         INNER JOIN usuarios_cuentas u ON u.id=e.user_id
         WHERE lp.updated_at BETWEEN :fromDate AND :toDate ${courseFilter} ${userFilter} ${userMembershipFilter}
         GROUP BY DATE(lp.updated_at) ORDER BY date ASC`,
        values,
      ),
      rows<Row>('SELECT id,title FROM academia_cursos WHERE status=\'published\' ORDER BY title', values),
      rows<Row>(
        `SELECT membership.level_id,COUNT(DISTINCT e.user_id) users,
          COUNT(DISTINCT e.id) participations,COUNT(DISTINCT lp.id) interactions
         FROM academia_inscripciones e
         INNER JOIN usuarios_cuentas u ON u.id=e.user_id
         INNER JOIN academia_cursos c ON c.id=e.course_id
         INNER JOIN (${activeMembershipsSql}) membership ON membership.user_id=e.user_id
         LEFT JOIN academia_progreso_lecciones lp ON lp.enrollment_id=e.id
           AND lp.updated_at BETWEEN :fromDate AND :toDate
         WHERE (e.updated_at BETWEEN :fromDate AND :toDate OR lp.id IS NOT NULL)
           ${courseFilter} ${userFilter}
         GROUP BY membership.level_id ORDER BY membership.level_id`,
        values,
      ),
    ]);
    const stats: Record<string, number> = {
      courses: normalizedNumber(catalogStats.courses),
      lessons: normalizedNumber(catalogStats.lessons),
      active_users: normalizedNumber(activityStats.active_users),
      participations: normalizedNumber(activityStats.participations),
      completed_courses: normalizedNumber(activityStats.completed_courses),
      lesson_activity: normalizedNumber(activityStats.lesson_activity),
      completed_lessons: normalizedNumber(activityStats.completed_lessons),
    };
    const normalizedCourses = courseRows.map((course) => ({
      ...course,
      students: normalizedNumber(course.students),
      page_views: normalizedNumber(course.page_views),
      visitors: normalizedNumber(course.visitors),
      usage_status: normalizedNumber(course.students) > 0 || normalizedNumber(course.page_views) > 0
        ? 'USED'
        : 'UNUSED',
    }));
    stats.used_courses = normalizedCourses.filter((course) => course.usage_status === 'USED').length;
    stats.unused_courses = normalizedCourses.filter((course) => course.usage_status === 'UNUSED').length;
    stats.course_page_views = normalizedCourses.reduce((sum, course) => sum + normalizedNumber(course.page_views), 0);
    return {
      period: { from: filters.from, to: filters.to }, stats, courses,
      courseRows: normalizedCourses, lessonRows, userRows, recent, daily,
      byScholarship: byScholarship.map((row) => ({ ...row, name: scholarshipName(row.level_id) })),
    };
  }
}
