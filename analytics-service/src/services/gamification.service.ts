/**
 * @file Reglas de negocio de gamificación: semáforo, XP, niveles y rachas.
 *
 * Aquí viven las constantes del sistema de puntos y el cálculo de rachas. Las
 * escrituras que deben ser atómicas (completar lección + otorgar XP) se
 * envuelven en la transacción que abre el repositorio.
 *
 * @see repositories/gamification.repository.ts Consultas SQL.
 */

import repository, { type SemaphoreStatus } from '#repositories/gamification.repository';
import { AppError } from '#utils/errors';
import {
  COURSE_COMPLETION_XP,
  LESSON_XP,
  normalizeSemaphoreStatus,
  numberValue,
  streakFrom,
  xpLevel,
} from './gamification/gamification-rules.js';

/** Servicio de gamificación. */
export class GamificationService {
  /** Racha del usuario para un tipo de actividad, o para ambos combinados. */
  private async streak(userId: string, kind: 'capsule' | 'lesson' | 'combined') {
    return streakFrom(await repository.activityDates(userId, kind));
  }

  /**
   * Registra una cápsula como completada con su autoevaluación de semáforo.
   *
   * Idempotente: repetirla actualiza el semáforo pero no duplica la actividad
   * diaria ni vuelve a sumar. Las cápsulas no otorgan XP, sólo cuentan para la
   * racha.
   *
   * @throws {AppError} Si el semáforo no es reconocible o la cápsula no está
   *   publicada.
   */
  async completeCapsule(userId: string, capsuleId: string, statusValue: unknown) {
    const semaphoreStatus = normalizeSemaphoreStatus(statusValue);
    if (!semaphoreStatus) {
      throw new AppError(
        'Selecciona GREEN, YELLOW o RED para registrar el semáforo',
        422,
        'INVALID_SEMAPHORE_STATUS',
      );
    }

    // Comprobar que la capsula este publicada y guardar el progreso van en la
    // misma transaccion: si no, una capsula despublicada a medio camino dejaria
    // progreso sobre contenido que ya no existe.
    const capsule = await repository.transaction(async (transaction) => {
      const found = await repository.findPublishedCapsule(capsuleId, transaction);
      if (!found) throw new AppError('Cápsula no encontrada', 404, 'CAPSULE_NOT_FOUND');
      const firstTime = await repository.saveCapsuleProgress(
        userId,
        capsuleId,
        semaphoreStatus,
        transaction,
      );
      // La actividad del día sólo se suma la primera vez. Repetir la cápsula o
      // corregir el color del semáforo no es una cápsula nueva; sumarla siempre
      // inflaba `capsule_completions` con cada doble clic. Es el mismo criterio
      // que ya aplicaba `completeLesson` con el XP otorgado.
      if (firstTime) await repository.recordActivity(userId, 'capsule', transaction);
      return found;
    });
    return { capsule, semaphoreStatus, progressPercent: 100 };
  }

  /**
   * Resumen de cápsulas: totales por semáforo, listado y racha.
   *
   * Un `statusValue` no reconocible se ignora y devuelve el listado completo,
   * en lugar de fallar.
   */
  async capsuleSummary(userId: string, statusValue?: unknown) {
    let semaphoreStatus: SemaphoreStatus | undefined;
    if (statusValue) {
      const normalized = normalizeSemaphoreStatus(statusValue);
      if (!normalized) {
        throw new AppError(
          'Filtro de semáforo no válido',
          422,
          'INVALID_SEMAPHORE_STATUS',
        );
      }
      semaphoreStatus = normalized;
    }
    const [{ available, semaphore: grouped }, items, streak] = await Promise.all([
      repository.capsuleTotals(userId),
      repository.capsuleItems(userId, semaphoreStatus),
      this.streak(userId, 'capsule'),
    ]);
    const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
    grouped.forEach((row) => {
      const key = String(row.semaphore_status) as SemaphoreStatus;
      if (key in counts) counts[key] = numberValue(row.total);
    });
    // El total de capsulas hechas se deduce sumando el semaforo, no con una
    // consulta aparte: cada capsula completada tiene exactamente un color.
    const completed = Object.values(counts).reduce((total, value) => total + value, 0);
    return {
      completed,
      available,
      percentage: available ? Math.round((completed / available) * 100) : 0,
      semaphore: counts,
      streak,
      items,
    };
  }

  /**
   * Completa una lección y aplica todas sus consecuencias, de forma atómica.
   *
   * En una sola transacción: valida que la lección pertenezca al curso y que
   * esté publicado, inscribe al usuario si hacía falta, marca la lección,
   * recalcula el avance del curso, registra la actividad del día y otorga XP —
   * el de la lección y, si con ésta se termina el curso, también el de
   * finalización.
   *
   * El XP se concede una sola vez por lección, así que volver a llamar devuelve
   * 0 puntos aunque el resto de los datos se refresquen.
   *
   * @throws {AppError} Si la lección no existe, no pertenece al curso o el curso
   *   no está publicado.
   */
  async completeLesson(userId: string, courseId: string, lessonId: string) {
    return repository.transaction(async (transaction) => {
      const lesson = await repository.findPublishedCourseLesson(courseId, lessonId, transaction);
      if (!lesson) throw new AppError('Lección no encontrada', 404, 'LESSON_NOT_FOUND');
      const lessonStates = await repository.courseLessonStates(userId, courseId, transaction);
      /**
       * Avance secuencial obligatorio.
       *
       * Solo se puede completar la primera leccion pendiente. La excepcion es
       * una leccion ya completada, que se puede repetir en cualquier momento
       * (sin volver a dar puntos).
       *
       * La comparacion pasa por `String` porque los identificadores llegan como
       * numero desde la base y como cadena desde la URL.
       *
       * @throws {AppError} 409 `PREVIOUS_LESSON_REQUIRED`, con el numero y el
       *   titulo de la leccion que falta, para que la interfaz pueda decirlo.
       */
      const currentIndex = lessonStates.findIndex((item) => String(item.id) === String(lessonId));
      // Primera leccion sin completar: es la unica que se puede marcar, y con
      // la que se compara para decidir si el intento salta el orden.
      const firstPendingIndex = lessonStates.findIndex((item) => numberValue(item.completed) === 0);
      const currentCompleted = currentIndex >= 0
        && numberValue(lessonStates[currentIndex].completed) === 1;
      if (!currentCompleted && firstPendingIndex >= 0 && currentIndex !== firstPendingIndex) {
        const required = lessonStates[firstPendingIndex];
        throw new AppError(
          `Primero completa la lección ${String(required.number)}: ${String(required.title)}`,
          409,
          'PREVIOUS_LESSON_REQUIRED',
        );
      }
      if (!currentCompleted) {
        const timer = await repository.readingTimerStatus(userId, courseId, lessonId, transaction);
        const timerEnabled = numberValue(timer?.reading_timer_enabled) === 1;
        const minimumSeconds = numberValue(timer?.minimum_reading_seconds);
        const accumulatedSeconds = numberValue(timer?.accumulated_seconds);
        if (timerEnabled && accumulatedSeconds < minimumSeconds) {
          const remainingMinutes = Math.max(1, Math.ceil((minimumSeconds - accumulatedSeconds) / 60));
          throw new AppError(
            `Continúa estudiando esta lección durante ${remainingMinutes} minuto(s) antes de completarla.`,
            409,
            'LESSON_READING_TIME_REQUIRED',
          );
        }
        const exam = await repository.lessonExamRequirement(userId, lessonId, transaction);
        if (exam && numberValue(exam.passed) !== 1) {
          throw new AppError(
            `Aprueba el examen "${String(exam.title)}" con una nota mínima de ${numberValue(exam.passing_score)} antes de completar la lección.`,
            409,
            'LESSON_EXAM_REQUIRED',
          );
        }
      }
      const enrollmentId = await repository.ensureEnrollment(userId, courseId, transaction);
      await repository.completeLesson(enrollmentId, lessonId, transaction);
      const progress = await repository.refreshEnrollment(enrollmentId, courseId, transaction);
      const lessonAwarded = await repository.awardXp(
        userId,
        'LESSON_COMPLETED',
        String(lessonId),
        courseId,
        lessonId,
        LESSON_XP,
        `Lección completada: ${String(lesson.lesson_title)}`,
        transaction,
      );
      const courseBonusAwarded = progress.status === 'COMPLETED'
        ? await repository.awardXp(
          userId,
          'COURSE_COMPLETED',
          String(courseId),
          courseId,
          null,
          COURSE_COMPLETION_XP,
          `Curso completado: ${String(lesson.course_title)}`,
          transaction,
        )
        : 0;
      if (lessonAwarded > 0) {
        await repository.recordActivity(userId, 'lesson', transaction);
      }
      const total = await repository.userTotalXp(userId, transaction);
      return {
        lesson,
        enrollmentId,
        progress,
        xp: {
          awarded: lessonAwarded + courseBonusAwarded,
          lessonAwarded,
          courseBonusAwarded,
          ...xpLevel(total),
        },
      };
    });
  }

  /** Desmarca una lección sin retirar XP ni borrar intentos de evaluación. */
  async uncompleteLesson(userId: string, courseId: string, lessonId: string) {
    return repository.transaction(async (transaction) => {
      const lesson = await repository.findPublishedCourseLesson(courseId, lessonId, transaction);
      if (!lesson) throw new AppError('Lección no encontrada', 404, 'LESSON_NOT_FOUND');
      const enrollmentId = await repository.ensureEnrollment(userId, courseId, transaction);
      await repository.uncompleteLesson(enrollmentId, lessonId, transaction);
      const progress = await repository.refreshEnrollment(enrollmentId, courseId, transaction);
      const total = await repository.userTotalXp(userId, transaction);
      return {
        lesson,
        enrollmentId,
        progress,
        xp: { awarded: 0, preserved: true, ...xpLevel(total) },
      };
    });
  }

  async readingTimerStatus(userId: string, courseId: string, lessonId: string) {
    return this.formatReadingTimer(await repository.readingTimerStatus(userId, courseId, lessonId));
  }

  async startReadingTimer(userId: string, courseId: string, lessonId: string) {
    const current = await repository.readingTimerStatus(userId, courseId, lessonId);
    if (!current) throw new AppError('Lección no encontrada', 404, 'LESSON_NOT_FOUND');
    if (numberValue(current.reading_timer_enabled) !== 1) return this.formatReadingTimer(current);
    return this.formatReadingTimer(await repository.startReadingTimer(userId, courseId, lessonId));
  }

  async heartbeatReadingTimer(userId: string, courseId: string, lessonId: string, pause = false) {
    const current = await repository.readingTimerStatus(userId, courseId, lessonId);
    if (!current) throw new AppError('Lección no encontrada', 404, 'LESSON_NOT_FOUND');
    if (numberValue(current.reading_timer_enabled) !== 1) return this.formatReadingTimer(current);
    return this.formatReadingTimer(await repository.heartbeatReadingTimer(userId, courseId, lessonId, pause));
  }

  private formatReadingTimer(value: Record<string, unknown> | null) {
    if (!value) throw new AppError('Lección no encontrada', 404, 'LESSON_NOT_FOUND');
    const enabled = numberValue(value.reading_timer_enabled) === 1;
    const minimumSeconds = enabled ? numberValue(value.minimum_reading_seconds) : 0;
    const elapsedSeconds = numberValue(value.accumulated_seconds);
    return {
      enabled,
      minimumSeconds,
      elapsedSeconds,
      remainingSeconds: Math.max(0, minimumSeconds - elapsedSeconds),
      active: enabled && numberValue(value.is_active) === 1,
      ready: !enabled || elapsedSeconds >= minimumSeconds,
    };
  }

  /**
   * Lecciones del curso con su estado y el avance del usuario.
   *
   * Funciona sin inscripción previa: en ese caso devuelve las lecciones con
   * avance cero, lo que permite previsualizar el curso antes de empezarlo.
   */
  async courseLessonStatus(userId: string, courseId: string) {
    const [lessons, exams] = await Promise.all([
      repository.courseLessonStates(userId, courseId),
      repository.courseExamStates(userId, courseId),
    ]);
    if (!lessons.length) {
      throw new AppError('Curso o lecciones no encontrados', 404, 'COURSE_LESSONS_NOT_FOUND');
    }
    /**
     * Primera leccion sin completar: es la unica que el usuario puede marcar, y
     * la que se expone como `nextLessonId`. Si vale -1, el curso esta terminado.
     */
    const firstPendingIndex = lessons.findIndex((item) => numberValue(item.completed) === 0);
    const examsByLesson = new Map(exams.map((exam) => [String(exam.lesson_id), exam]));
    return {
      courseId,
      completedLessons: lessons.filter((item) => numberValue(item.completed) === 1).length,
      totalLessons: lessons.length,
      nextLessonId: firstPendingIndex >= 0 ? String(lessons[firstPendingIndex].id) : null,
      lessons: lessons.map((item, index) => {
        const completed = numberValue(item.completed) === 1;
        const canComplete = !completed && index === firstPendingIndex;
        const required = !completed && firstPendingIndex >= 0 && index > firstPendingIndex
          ? lessons[firstPendingIndex]
          : null;
        const exam = examsByLesson.get(String(item.id));
        const examPassed = !exam || numberValue(exam.passed) === 1;
        const timerEnabled = numberValue(item.reading_timer_enabled) === 1;
        const minimumSeconds = timerEnabled ? numberValue(item.minimum_reading_seconds) : 0;
        const elapsedSeconds = numberValue(item.reading_seconds);
        const timerReady = !timerEnabled || elapsedSeconds >= minimumSeconds;
        return {
          id: String(item.id),
          number: numberValue(item.number),
          title: String(item.title),
          completed,
          canComplete: canComplete && examPassed && timerReady,
          locked: Boolean(required),
          timer: {
            enabled: timerEnabled,
            minimumSeconds,
            elapsedSeconds,
            remainingSeconds: Math.max(0, minimumSeconds - elapsedSeconds),
            active: timerEnabled && numberValue(item.timer_active) === 1,
            ready: timerReady,
          },
          exam: exam ? {
            id: String(exam.exam_id),
            title: String(exam.title),
            passingScore: numberValue(exam.passing_score),
            maxAttempts: numberValue(exam.max_attempts),
            attemptsUsed: numberValue(exam.attempts_used),
            bestScore: numberValue(exam.best_score),
            passed: numberValue(exam.passed) === 1,
            required: true,
          } : null,
          requiredLesson: required
            ? {
              id: String(required.id),
              number: numberValue(required.number),
              title: String(required.title),
            }
            : null,
        };
      }),
    };
  }

  /** Cursos del usuario con avance, XP acumulado, nivel y racha de lecciones. */
  async courseSummary(userId: string) {
    const [{ availableLessons, courses }, streak, xpData] = await Promise.all([
      repository.courseTotals(userId),
      this.streak(userId, 'lesson'),
      repository.xpSummary(userId),
    ]);
    const xpByCourse = new Map(
      xpData.byCourse.map((row) => [String(row.course_id), numberValue(row.total)]),
    );
    /**
     * Cursos del usuario con su progreso y los puntos ganados en cada uno.
     *
     * Los puntos se cruzan desde un mapa previo en lugar de con un JOIN, y un
     * curso sin puntos registrados queda en 0 en vez de sin el campo.
     */
    const items = courses.map((course) => ({
      ...course,
      status: String(course.status ?? 'ACTIVE'),
      total_lessons: numberValue(course.total_lessons),
      completed_lessons: numberValue(course.completed_lessons),
      progress_percent: numberValue(course.progress_percent),
      earned_xp: xpByCourse.get(String(course.id)) ?? 0,
    }));
    const completedLessons = items.reduce(
      (total, course) => total + numberValue(course.completed_lessons),
      0,
    );
    return {
      activeCourses: items.filter((course) => String(course.status) === 'ACTIVE').length,
      completedCourses: items.filter((course) => String(course.status) === 'COMPLETED').length,
      completedLessons,
      availableLessons,
      percentage: availableLessons
        ? Math.round((completedLessons / availableLessons) * 100)
        : 0,
      streak,
      xp: {
        ...xpLevel(xpData.total),
        recentEvents: xpData.recentEvents.map((event) => ({
          ...event,
          points: numberValue(event.points),
        })),
      },
      items,
    };
  }

  /**
   * Resumen único para el panel: cápsulas, cursos, XP, nivel y racha combinada.
   *
   * Existe para que el panel no tenga que hacer tres llamadas. La racha aquí
   * cuenta un día como activo si hubo cápsulas **o** lecciones.
   */
  async combinedSummary(userId: string) {
    const [capsules, courses, streak] = await Promise.all([
      this.capsuleSummary(userId),
      this.courseSummary(userId),
      this.streak(userId, 'combined'),
    ]);
    const completedUnits = capsules.completed + courses.completedLessons;
    const availableUnits = capsules.available + courses.availableLessons;
    return {
      capsules: {
        completed: capsules.completed,
        available: capsules.available,
        percentage: capsules.percentage,
      },
      courses: {
        active: courses.activeCourses,
        completed: courses.completedCourses,
        completedLessons: courses.completedLessons,
        availableLessons: courses.availableLessons,
        percentage: courses.percentage,
        xp: courses.xp.total,
        level: courses.xp.level,
      },
      overall: {
        completedUnits,
        availableUnits,
        percentage: availableUnits
          ? Math.round((completedUnits / availableUnits) * 100)
          : 0,
        streak,
      },
    };
  }
}

/** Instancia única usada por el controlador. */
export default new GamificationService();
