/**
 * @file Acceso a datos de gamificación: cápsulas, lecciones, XP y rachas.
 *
 * A diferencia del resto del servicio, aquí no se usa el CRUD genérico ni los
 * modelos de Sequelize: son consultas SQL escritas a mano porque cruzan tablas
 * de tres dominios distintos (`contenido_*`, `academia_*`, `analitica_*`).
 *
 * Todas las consultas usan `replacements`, es decir, van parametrizadas: los
 * valores no se interpolan en el SQL. Las dos únicas interpolaciones de texto
 * ({@link GamificationRepository.capsuleItems} y
 * {@link GamificationRepository.activityDates}) sólo insertan fragmentos
 * derivados de conjuntos cerrados, nunca datos del cliente.
 *
 * Varias escrituras son idempotentes por diseño, mediante
 * `ON DUPLICATE KEY UPDATE`: repetir la misma acción no duplica registros.
 *
 * @see services/gamification.service.ts Reglas de negocio que lo consumen.
 */

import { randomUUID } from 'node:crypto';
import { QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';

/** Semáforo de avance de una cápsula. */
export type SemaphoreStatus = 'GREEN' | 'YELLOW' | 'RED';
/** Tipo de actividad que alimenta los contadores diarios y la racha. */
export type ActivityKind = 'capsule' | 'lesson';
/**
 * Eventos que otorgan XP.
 *
 * El par (`user_id`, `event_type`, `source_id`) es lo que hace idempotente la
 * concesión de puntos en {@link GamificationRepository.awardXp}.
 */
export type XpEventType = 'LESSON_COMPLETED' | 'COURSE_COMPLETED';

/** Fila sin tipar: estas consultas devuelven columnas de varias tablas. */
type Row = Record<string, unknown>;

/**
 * Ejecuta un SELECT parametrizado y devuelve las filas.
 *
 * `transaction` es opcional: al omitirlo la consulta corre fuera de cualquier
 * transacción y no ve los cambios aún sin confirmar.
 */
const rows = <T extends Row>(
  sql: string,
  replacements: Record<string, unknown> = {},
  transaction?: Transaction,
): Promise<T[]> => database.query<T>(sql, {
  replacements,
  transaction,
  type: QueryTypes.SELECT,
});

/** Consultas y escrituras de gamificación. */
export class GamificationRepository {
  /**
   * Abre una transacción gestionada por Sequelize.
   *
   * Confirma al terminar el callback y revierte si lanza. El servicio la usa
   * para que completar una lección y otorgar su XP sean atómicos.
   */
  transaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    return database.transaction(callback);
  }

  /**
   * Busca una cápsula publicada.
   *
   * Filtra por `status = 'published'`, de modo que una cápsula en borrador se
   * comporta como inexistente y no se puede completar.
   *
   * @returns La cápsula, o `null` si no existe o no está publicada.
   */
  async findPublishedCapsule(capsuleId: string, transaction?: Transaction) {
    const [capsule] = await rows<Row>(
      `SELECT id, slug, title, summary, category, image
       FROM contenido_capsulas
       WHERE id = :capsuleId AND status = 'published'
       LIMIT 1`,
      { capsuleId },
      transaction,
    );
    return capsule ?? null;
  }

  /**
   * Marca una cápsula como completada para el usuario.
   *
   * Es un upsert: repetir la llamada actualiza el semáforo y la fecha en lugar
   * de insertar otra fila. Fija `progress_percent` a 100 siempre, así que no
   * sirve para registrar avances parciales.
   *
   * @returns `true` sólo la primera vez que se completa la cápsula. Quien llama
   *   lo necesita para no volver a sumar la actividad del día: cambiar el color
   *   del semáforo o hacer doble clic no son una cápsula nueva. MySQL informa de
   *   una fila afectada cuando inserta y de dos cuando actualiza, que es lo que
   *   permite distinguirlo sin una consulta previa.
   */
  async saveCapsuleProgress(
    userId: string,
    capsuleId: string,
    semaphoreStatus: SemaphoreStatus,
    transaction: Transaction,
  ): Promise<boolean> {
    const now = new Date();
    const result = await database.query(
      `INSERT INTO analitica_progreso_capsulas
        (id, user_id, capsule_id, semaphore_status, progress_percent, completed_at, created_at, updated_at)
       VALUES
        (:id, :userId, :capsuleId, :semaphoreStatus, 100.00, :now, :now, :now)
       ON DUPLICATE KEY UPDATE
        semaphore_status = VALUES(semaphore_status),
        progress_percent = 100.00,
        completed_at = VALUES(completed_at),
        updated_at = VALUES(updated_at)`,
      {
        replacements: {
          id: randomUUID(),
          userId,
          capsuleId,
          semaphoreStatus,
          now,
        },
        transaction,
      },
    );
    // Con el dialecto MySQL, Sequelize devuelve `[insertId, filasAfectadas]`.
    return Number((result as unknown as [unknown, number])[1] ?? 0) === 1;
  }

  /**
   * Valida que la lección pertenezca al curso y que el curso esté publicado.
   *
   * Comprobar ambas cosas en una consulta evita que se pueda completar una
   * lección pasando el id de otro curso.
   *
   * @returns Datos de curso y lección, o `null` si la combinación no es válida.
   */
  async findPublishedCourseLesson(
    courseId: string,
    lessonId: string,
    transaction?: Transaction,
  ) {
    const [lesson] = await rows<Row>(
      `SELECT
         c.id AS course_id, c.slug AS course_slug, c.title AS course_title,
         c.reading_timer_enabled,
         l.id AS lesson_id, l.number AS lesson_number, l.title AS lesson_title,
         l.minimum_reading_seconds
       FROM academia_cursos c
       INNER JOIN academia_lecciones l ON l.course_id = c.id
       WHERE c.id = :courseId
         AND l.id = :lessonId
         AND c.status = 'published'
       LIMIT 1`,
      { courseId, lessonId },
      transaction,
    );
    return lesson ?? null;
  }

  /**
   * Lecciones del curso con su estado para el usuario.
   *
   * Los `LEFT JOIN` con inscripción y progreso hacen que devuelva todas las
   * lecciones aunque el usuario no esté inscrito; en ese caso `completed` es 0.
   * Ordena por número de lección.
   */
  courseLessonStates(
    userId: string,
    courseId: string,
    transaction?: Transaction,
  ) {
    return rows<Row>(
      `SELECT
         l.id, l.number, l.title, l.module,
         c.reading_timer_enabled, l.minimum_reading_seconds,
         COALESCE(rt.accumulated_seconds,0) AS reading_seconds,
         COALESCE(rt.is_active,0) AS timer_active,
         CASE WHEN lp.status = 'COMPLETED' THEN 1 ELSE 0 END AS completed
       FROM academia_lecciones l
       INNER JOIN academia_cursos c
         ON c.id = l.course_id AND c.status = 'published'
       LEFT JOIN academia_inscripciones e
         ON e.course_id = c.id AND e.user_id = :userId
       LEFT JOIN academia_progreso_lecciones lp
         ON lp.enrollment_id = e.id AND lp.lesson_id = l.id
       LEFT JOIN academia_tiempo_lectura rt
         ON rt.lesson_id = l.id AND rt.user_id = :userId
       WHERE l.course_id = :courseId
       ORDER BY l.number ASC, l.id ASC`,
      { userId, courseId },
      transaction,
    );
  }

  async readingTimerStatus(userId: string, courseId: string, lessonId: string, transaction?: Transaction) {
    const [status] = await rows<Row>(
      `SELECT c.reading_timer_enabled,l.minimum_reading_seconds,
         COALESCE(t.accumulated_seconds,0) accumulated_seconds,
         COALESCE(t.is_active,0) is_active
       FROM academia_cursos c
       INNER JOIN academia_lecciones l ON l.course_id=c.id
       LEFT JOIN academia_tiempo_lectura t ON t.lesson_id=l.id AND t.user_id=:userId
       WHERE c.id=:courseId AND l.id=:lessonId AND c.status='published'
       LIMIT 1`,
      { userId, courseId, lessonId },
      transaction,
    );
    return status ?? null;
  }

  async startReadingTimer(userId: string, courseId: string, lessonId: string) {
    const requirement = await this.readingTimerStatus(userId, courseId, lessonId);
    if (!requirement) return null;
    const now = new Date();
    await database.query(
      `INSERT INTO academia_tiempo_lectura
        (id,user_id,lesson_id,accumulated_seconds,is_active,started_at,last_heartbeat_at,completed_at,created_at,updated_at)
       VALUES (:id,:userId,:lessonId,0,1,:now,:now,NULL,:now,:now)
       ON DUPLICATE KEY UPDATE is_active=1,last_heartbeat_at=VALUES(last_heartbeat_at),
         started_at=COALESCE(started_at,VALUES(started_at)),updated_at=VALUES(updated_at)`,
      { replacements: { id: randomUUID(), userId, lessonId, now } },
    );
    return this.readingTimerStatus(userId, courseId, lessonId);
  }

  async heartbeatReadingTimer(userId: string, courseId: string, lessonId: string, pause = false) {
    const now = new Date();
    await database.query(
      `UPDATE academia_tiempo_lectura t
       INNER JOIN academia_lecciones l ON l.id=t.lesson_id AND l.course_id=:courseId
       SET t.accumulated_seconds=t.accumulated_seconds + LEAST(30,GREATEST(0,TIMESTAMPDIFF(SECOND,t.last_heartbeat_at,:now))),
           t.last_heartbeat_at=:now,t.is_active=:isActive,t.updated_at=:now
       WHERE t.user_id=:userId AND t.lesson_id=:lessonId AND t.is_active=1`,
      { replacements: { userId, courseId, lessonId, now, isActive: pause ? 0 : 1 } },
    );
    return this.readingTimerStatus(userId, courseId, lessonId);
  }

  /** Exámenes publicados del curso y estado de aprobación del usuario. */
  courseExamStates(userId: string, courseId: string, transaction?: Transaction) {
    return rows<Row>(
      `SELECT e.id exam_id,e.lesson_id,e.title,e.passing_score,e.max_attempts,
         COALESCE(MAX(a.score),0) best_score,COALESCE(MAX(a.passed),0) passed,
         COUNT(a.id) attempts_used
       FROM academia_examenes e
       INNER JOIN academia_lecciones l ON l.id=e.lesson_id
       LEFT JOIN academia_examen_intentos a ON a.exam_id=e.id AND a.user_id=:userId
       WHERE l.course_id=:courseId AND e.status='PUBLISHED'
       GROUP BY e.id,e.lesson_id,e.title,e.passing_score,e.max_attempts`,
      { userId, courseId },
      transaction,
    );
  }

  async lessonExamRequirement(userId: string, lessonId: string, transaction?: Transaction) {
    const [exam] = await rows<Row>(
      `SELECT e.id,e.title,e.passing_score,e.max_attempts,
         COALESCE(MAX(a.score),0) best_score,COALESCE(MAX(a.passed),0) passed,
         COUNT(a.id) attempts_used
       FROM academia_examenes e
       LEFT JOIN academia_examen_intentos a ON a.exam_id=e.id AND a.user_id=:userId
       WHERE e.lesson_id=:lessonId AND e.status='PUBLISHED'
       GROUP BY e.id,e.title,e.passing_score,e.max_attempts
       LIMIT 1`,
      { userId, lessonId },
      transaction,
    );
    return exam ?? null;
  }

  /**
   * Devuelve la inscripción del usuario en el curso, creándola si no existe.
   *
   * Inscribe de forma implícita al completar la primera lección: no hace falta
   * un alta previa.
   *
   * La tabla **sí** tiene `UNIQUE (user_id, course_id)`, así que nunca llegaron a
   * duplicarse inscripciones. Lo que fallaba era el camino más común del alumno:
   * al hacer doble clic en la primera lección de un curso, las dos peticiones
   * leían «no existe» y la segunda reventaba con error de duplicado, tumbando la
   * transacción entera de `completeLesson` —ni se marcaba la lección ni se
   * otorgaba XP— y devolviendo un 400 con el mensaje crudo de MySQL.
   *
   * Ahora la lectura toma `FOR UPDATE`: el bloqueo sobre el índice único
   * serializa a las peticiones concurrentes, de modo que la segunda espera y
   * encuentra la fila ya creada. La reconsulta posterior al alta cierra el caso
   * residual en que otra transacción gane la carrera pese al bloqueo.
   *
   * @returns Identificador de la inscripción.
   */
  async ensureEnrollment(userId: string, courseId: string, transaction: Transaction) {
    const [existing] = await rows<Row>(
      `SELECT id FROM academia_inscripciones
       WHERE user_id = :userId AND course_id = :courseId
       LIMIT 1 FOR UPDATE`,
      { userId, courseId },
      transaction,
    );
    if (existing) return String(existing.id);

    const id = randomUUID();
    const now = new Date();
    await database.query(
      `INSERT INTO academia_inscripciones
        (id, user_id, legacy_wp_user_id, course_id, status, enrolled_at,
         completed_at, progress_percent, created_at, updated_at)
       VALUES
        (:id, :userId, NULL, :courseId, 'ACTIVE', :now,
         NULL, 0.00, :now, :now)
       ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)`,
      { replacements: { id, userId, courseId, now }, transaction },
    );
    const [created] = await rows<Row>(
      `SELECT id FROM academia_inscripciones
       WHERE user_id = :userId AND course_id = :courseId
       LIMIT 1`,
      { userId, courseId },
      transaction,
    );
    return created ? String(created.id) : id;
  }

  /**
   * Marca la lección como completada al 100 %.
   *
   * Upsert idempotente: volver a completarla sólo refresca las fechas.
   */
  async completeLesson(
    enrollmentId: string,
    lessonId: string,
    transaction: Transaction,
  ) {
    const now = new Date();
    await database.query(
      `INSERT INTO academia_progreso_lecciones
        (id, enrollment_id, lesson_id, status, progress_percent,
         last_position_seconds, started_at, completed_at, created_at, updated_at)
       VALUES
        (:id, :enrollmentId, :lessonId, 'COMPLETED', 100.00,
         0, :now, :now, :now, :now)
       ON DUPLICATE KEY UPDATE
        status = 'COMPLETED',
        progress_percent = 100.00,
        completed_at = VALUES(completed_at),
        updated_at = VALUES(updated_at)`,
      {
        replacements: { id: randomUUID(), enrollmentId, lessonId, now },
        transaction,
      },
    );
  }

  /** Revierte sólo el estado de avance; el historial de XP nunca se elimina. */
  async uncompleteLesson(
    enrollmentId: string,
    lessonId: string,
    transaction: Transaction,
  ) {
    const now = new Date();
    await database.query(
      `UPDATE academia_progreso_lecciones
       SET status='IN_PROGRESS',progress_percent=0.00,completed_at=NULL,updated_at=:now
       WHERE enrollment_id=:enrollmentId AND lesson_id=:lessonId`,
      { replacements: { enrollmentId, lessonId, now }, transaction },
    );
  }

  /**
   * Recalcula el avance de la inscripción y la cierra si procede.
   *
   * El porcentaje se redondea a dos decimales. La inscripción pasa a
   * `COMPLETED` sólo si el curso tiene lecciones y todas están completas; si no,
   * vuelve a `ACTIVE` y limpia `completed_at`, de modo que añadir una lección
   * nueva a un curso ya terminado lo reabre en el siguiente recálculo.
   *
   * @returns `{ total, completed, percentage, status }`.
   */
  async refreshEnrollment(
    enrollmentId: string,
    courseId: string,
    transaction: Transaction,
  ) {
    const [counts] = await rows<Row>(
      `SELECT
         COUNT(l.id) AS total_lessons,
         COUNT(CASE WHEN lp.status = 'COMPLETED' THEN 1 END) AS completed_lessons
       FROM academia_lecciones l
       LEFT JOIN academia_progreso_lecciones lp
         ON lp.lesson_id = l.id AND lp.enrollment_id = :enrollmentId
       WHERE l.course_id = :courseId`,
      { enrollmentId, courseId },
      transaction,
    );
    const total = Number(counts?.total_lessons ?? 0);
    const completed = Number(counts?.completed_lessons ?? 0);
    const percentage = total ? Math.round((completed / total) * 10000) / 100 : 0;
    const status = total > 0 && completed >= total ? 'COMPLETED' : 'ACTIVE';
    const now = new Date();

    await database.query(
      `UPDATE academia_inscripciones
       SET status = :status,
           progress_percent = :percentage,
           completed_at = CASE WHEN :status = 'COMPLETED' THEN :now ELSE NULL END,
           updated_at = :now
       WHERE id = :enrollmentId`,
      {
        replacements: { status, percentage, now, enrollmentId },
        transaction,
      },
    );
    return { total, completed, percentage, status };
  }

  /**
   * Suma una actividad al contador del día.
   *
   * La fecha la pone la base de datos con `CURRENT_DATE()`, no la aplicación:
   * el corte del día depende de la zona horaria del servidor MySQL. Es lo que
   * alimenta el cálculo de rachas.
   */
  async recordActivity(userId: string, kind: ActivityKind, transaction: Transaction) {
    const now = new Date();
    const capsuleIncrement = kind === 'capsule' ? 1 : 0;
    const lessonIncrement = kind === 'lesson' ? 1 : 0;
    await database.query(
      `INSERT INTO analitica_actividad_aprendizaje
        (user_id, activity_date, capsule_completions, lesson_completions,
         last_activity_at, created_at, updated_at)
       VALUES
        (:userId, CURRENT_DATE(), :capsuleIncrement, :lessonIncrement, :now, :now, :now)
       ON DUPLICATE KEY UPDATE
        capsule_completions = capsule_completions + VALUES(capsule_completions),
        lesson_completions = lesson_completions + VALUES(lesson_completions),
        last_activity_at = VALUES(last_activity_at),
        updated_at = VALUES(updated_at)`,
      {
        replacements: {
          userId,
          capsuleIncrement,
          lessonIncrement,
          now,
        },
        transaction,
      },
    );
  }

  /**
   * Otorga puntos por un evento, una sola vez.
   *
   * Doble protección contra la doble concesión: primero comprueba si el evento
   * ya existe usando `FOR UPDATE`, que bloquea la fila dentro de la transacción
   * y serializa a los concurrentes; y además captura la violación de restricción
   * única por si la carrera se cuela.
   *
   * @returns Los puntos concedidos, o **0** si ya se habían otorgado antes.
   */
  async awardXp(
    userId: string,
    eventType: XpEventType,
    sourceId: string,
    courseId: string,
    lessonId: string | null,
    points: number,
    description: string,
    transaction: Transaction,
  ) {
    const [existing] = await rows<Row>(
      `SELECT id
       FROM analitica_eventos_xp
       WHERE user_id = :userId
         AND event_type = :eventType
         AND source_id = :sourceId
       LIMIT 1
       FOR UPDATE`,
      { userId, eventType, sourceId },
      transaction,
    );
    if (existing) return 0;

    const now = new Date();
    try {
      await database.query(
        `INSERT INTO analitica_eventos_xp
          (id, user_id, event_type, source_id, course_id, lesson_id,
           points, description, earned_at, created_at)
         VALUES
          (:id, :userId, :eventType, :sourceId, :courseId, :lessonId,
           :points, :description, :now, :now)`,
        {
          replacements: {
            id: randomUUID(),
            userId,
            eventType,
            sourceId,
            courseId,
            lessonId,
            points,
            description,
            now,
          },
          transaction,
        },
      );
      return points;
    } catch (error) {
      if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') return 0;
      throw error;
    }
  }

  /** XP acumulado del usuario. Devuelve 0 si no tiene eventos. */
  async userTotalXp(userId: string, transaction?: Transaction) {
    const [total] = await rows<Row>(
      `SELECT COALESCE(SUM(points), 0) AS total
       FROM analitica_eventos_xp
       WHERE user_id = :userId`,
      { userId },
      transaction,
    );
    return Number(total?.total ?? 0);
  }

  /**
   * Resumen de XP: total, desglose por curso y los 8 eventos más recientes.
   *
   * Las tres consultas van en paralelo y **fuera de transacción**, así que
   * podrían reflejar estados ligeramente distintos entre sí.
   */
  async xpSummary(userId: string) {
    const [total, byCourse, recentEvents] = await Promise.all([
      this.userTotalXp(userId),
      rows<Row>(
        `SELECT course_id, COALESCE(SUM(points), 0) AS total
         FROM analitica_eventos_xp
         WHERE user_id = :userId
         GROUP BY course_id`,
        { userId },
      ),
      rows<Row>(
        `SELECT
           x.id, x.event_type, x.points, x.description, x.earned_at,
           x.course_id, x.lesson_id,
           c.slug AS course_slug, c.title AS course_title,
           l.title AS lesson_title
         FROM analitica_eventos_xp x
         INNER JOIN academia_cursos c ON c.id = x.course_id
         LEFT JOIN academia_lecciones l ON l.id = x.lesson_id
         WHERE x.user_id = :userId
         ORDER BY x.earned_at DESC, x.created_at DESC
         LIMIT 8`,
        { userId },
      ),
    ]);
    return { total, byCourse, recentEvents };
  }

  /**
   * Cápsulas publicadas disponibles y conteo del usuario por semáforo.
   *
   * El conteo por semáforo sólo incluye los estados que el usuario tenga
   * registrados: un semáforo sin cápsulas no aparece con cero, simplemente no
   * aparece.
   */
  async capsuleTotals(userId: string) {
    const [available] = await rows<Row>(
      `SELECT COUNT(*) AS total FROM contenido_capsulas WHERE status = 'published'`,
    );
    const semaphore = await rows<Row>(
      `SELECT semaphore_status, COUNT(*) AS total
       FROM analitica_progreso_capsulas
       WHERE user_id = :userId
       GROUP BY semaphore_status`,
      { userId },
    );
    return { available: Number(available?.total ?? 0), semaphore };
  }

  /**
   * Cápsulas del usuario, opcionalmente filtradas por semáforo.
   *
   * El filtro se añade como fragmento de SQL, pero el valor viaja
   * parametrizado. El fragmento sólo se inserta cuando `semaphoreStatus` está
   * presente y su tipo lo restringe a tres valores, así que no hay vía de
   * inyección — mantener esa restricción si se amplía la firma.
   */
  capsuleItems(userId: string, semaphoreStatus?: SemaphoreStatus) {
    const semaphoreSql = semaphoreStatus
      ? 'AND p.semaphore_status = :semaphoreStatus'
      : '';
    return rows<Row>(
      `SELECT
         p.capsule_id AS id, c.slug, c.title, c.summary, c.category, c.image,
         p.semaphore_status, p.progress_percent, p.completed_at, p.updated_at
       FROM analitica_progreso_capsulas p
       INNER JOIN contenido_capsulas c ON c.id = p.capsule_id
       WHERE p.user_id = :userId
         AND c.status = 'published'
         ${semaphoreSql}
       ORDER BY p.updated_at DESC`,
      { userId, ...(semaphoreStatus ? { semaphoreStatus } : {}) },
    );
  }

  /**
   * Cursos del usuario con su avance, y total de lecciones publicadas.
   *
   * El `GROUP BY` enumera todas las columnas seleccionadas porque los `LEFT
   * JOIN` con lecciones y progreso multiplican las filas; agrupar así las
   * colapsa de nuevo a una por curso.
   */
  async courseTotals(userId: string) {
    const [available] = await rows<Row>(
      `SELECT COUNT(l.id) AS total
       FROM academia_lecciones l
       INNER JOIN academia_cursos c ON c.id = l.course_id
       WHERE c.status = 'published'`,
    );
    const courses = await rows<Row>(
      `SELECT
         c.id, c.slug, c.title, c.summary, c.category, c.image,
         e.id AS enrollment_id, e.status, e.progress_percent,
         e.enrolled_at, e.completed_at,
         COUNT(l.id) AS total_lessons,
         COUNT(CASE WHEN lp.status = 'COMPLETED' THEN 1 END) AS completed_lessons
       FROM academia_inscripciones e
       INNER JOIN academia_cursos c ON c.id = e.course_id
       LEFT JOIN academia_lecciones l ON l.course_id = c.id
       LEFT JOIN academia_progreso_lecciones lp
         ON lp.lesson_id = l.id AND lp.enrollment_id = e.id
       WHERE e.user_id = :userId AND c.status = 'published'
       GROUP BY
         c.id, c.slug, c.title, c.summary, c.category, c.image,
         e.id, e.status, e.progress_percent, e.enrolled_at, e.completed_at
       ORDER BY e.updated_at DESC`,
      { userId },
    );
    return { availableLessons: Number(available?.total ?? 0), courses };
  }

  /**
   * Fechas con actividad, en orden descendente, para calcular la racha.
   *
   * La condición se elige entre tres alternativas fijas según `kind`; no se
   * interpola nada que venga del cliente.
   */
  activityDates(userId: string, kind: 'capsule' | 'lesson' | 'combined') {
    const condition = kind === 'capsule'
      ? 'capsule_completions > 0'
      : kind === 'lesson'
        ? 'lesson_completions > 0'
        : '(capsule_completions > 0 OR lesson_completions > 0)';
    return rows<Row>(
      `SELECT activity_date
       FROM analitica_actividad_aprendizaje
       WHERE user_id = :userId AND ${condition}
       ORDER BY activity_date DESC`,
      { userId },
    );
  }
}

/** Instancia única usada por el servicio. */
export default new GamificationRepository();
