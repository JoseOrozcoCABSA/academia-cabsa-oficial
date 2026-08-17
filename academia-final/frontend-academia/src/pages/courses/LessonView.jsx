/**
 * @file Componente `LessonView`.
 *
 * Consume: `coursesService`, `gamificationService`.
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { coursesService } from '@/services/coursesService';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import { courses as referenceCourses } from '@/data/referenceCatalog';
import { sanitizeContentHtml } from '@/utils/sanitizeContentHtml';
import { useAuth } from '@/hooks/useAuth';
import { gamificationService } from '@/services/gamificationService';
import LessonExam from '@/components/exams/LessonExam';
import LessonReadingTimer from '@/components/courses/LessonReadingTimer';
import '@/courses.css';
import '@/gamification.css';

/**
 * Agrupa las lecciones en modulos conservando el orden de llegada.
 *
 * Las lecciones sin `module` van a un grupo generico, para que ninguna quede
 * fuera del indice. El orden de los modulos es el de la primera leccion de cada
 * uno, no un orden declarado.
 */
const groupLessons = (lessons) => {
  const modules = new Map();
  lessons.forEach((lesson) => {
    const title = lesson.module || 'Contenido del curso';
    const group = modules.get(title);
    if (group) group.lessons.push(lesson);
    else modules.set(title, { title, lessons: [lesson] });
  });
  return [...modules.values()];
};

/**
 * Visor de una leccion, con temario lateral, avance y recompensa de puntos.
 *
 * El contenido pasa por `sanitizeContentHtml` antes de inyectarse. Marcar la
 * leccion como completada exige que sea la primera pendiente: el orden lo impone
 * el backend, que responde 409 si se intenta saltar.
 */
export default function LessonView() {
  const { resourceAllowed } = useMembershipAccess();
  const { slug, number } = useParams();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completionState, setCompletionState] = useState('');
  const [completionError, setCompletionError] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [lessonProgressState, setLessonProgressState] = useState(null);
  const [progressStateLoading, setProgressStateLoading] = useState(false);
  const [progressStateError, setProgressStateError] = useState('');
  const [xpReward, setXpReward] = useState(null);
  const [readingTimer, setReadingTimer] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    coursesService.findCourseBySlug(slug)
      .then(async (result) => {
        const courseLessons = await coursesService.listCourseLessons(result.id);
        if (active) {
          setCourse(result);
          setLessons(courseLessons);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        // Si la API falla se cae al catalogo estatico para que la pantalla no
        // quede en blanco. Se muestra ademas el error, asi que el contenido
        // visible puede no ser el real.
        const fallback = referenceCourses.find((item) => (item.slug || item.id) === slug);
        setCourse(fallback ?? null);
        setLessons(fallback ? coursesService.referenceLessons(fallback) : []);
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  /**
   * Posicion de la leccion pedida en la URL.
   *
   * La comparacion pasa por `Number` porque el parametro de ruta llega como
   * cadena. Un numero inexistente deja `currentIndex` en -1 y `lesson` en
   * `null`, que es lo que la vista trata como «no encontrada».
   *
   * La navegacion anterior/siguiente se calcula por posicion en el arreglo, no
   * por el campo `number`: si la numeracion tuviera huecos, seguiria siendo
   * continua.
   */
  const currentIndex = lessons.findIndex((item) => Number(item.number) === Number(number));
  const lesson = currentIndex >= 0 ? lessons[currentIndex] : null;
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? lessons[currentIndex + 1] : null;
  /** Indice lateral del curso, agrupado por modulo. */
  const modules = useMemo(() => groupLessons(lessons), [lessons]);
  const lessonProgressById = useMemo(
    () => new Map(
      (lessonProgressState?.lessons || []).map((item) => [String(item.id), item]),
    ),
    [lessonProgressState],
  );
  const currentLessonProgress = lesson?.id
    ? lessonProgressById.get(String(lesson.id))
    : null;
  const effectiveTimer = readingTimer || currentLessonProgress?.timer;
  useEffect(() => {
    setReadingTimer(currentLessonProgress?.timer || null);
  }, [lesson?.id, currentLessonProgress?.timer?.elapsedSeconds, currentLessonProgress?.timer?.ready]);
  const safeContent = useMemo(
    () => sanitizeContentHtml(lesson?.content || ''),
    [lesson?.content],
  );
  const progress = lessons.length && currentIndex >= 0
    ? ((currentIndex + 1) / lessons.length) * 100
    : 0;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = lesson?.title
      ? `${lesson.title} — Academia CABSA`
      : 'Lección — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, [lesson]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !course?.id) {
      setLessonProgressState(null);
      setProgressStateError('');
      return () => {
        active = false;
      };
    }

    setProgressStateLoading(true);
    setLessonProgressState(null);
    setProgressStateError('');
    gamificationService.courseLessonStatus(course.id)
      .then((result) => {
        if (active) setLessonProgressState(result);
      })
      .catch((requestError) => {
        if (active) setProgressStateError(requestError.message);
      })
      .finally(() => {
        if (active) setProgressStateLoading(false);
      });

    return () => {
      active = false;
    };
  }, [course?.id, isAuthenticated]);

  /**
   * Marca la leccion como completada y refresca el progreso.
   *
   * Sale sin hacer nada si aun no se conocen el curso o la leccion, lo que evita
   * enviar la peticion durante la carga inicial.
   *
   * Tras registrar la finalizacion vuelve a consultar el estado del curso en
   * lugar de deducirlo en el cliente, porque los puntos y el bono de curso los
   * calcula el servicio de analitica. Solo muestra la animacion de recompensa si
   * realmente se otorgaron puntos: repetir la misma leccion no da mas, y en ese
   * caso no se anima nada.
   */
  const completeLesson = async () => {
    if (!course?.id || !lesson?.id) return;
    setSavingCompletion(true);
    setCompletionState('');
    setCompletionError(false);
    try {
      const result = await gamificationService.completeLesson(course.id, lesson.id);
      setLessonProgressState(await gamificationService.courseLessonStatus(course.id));
      if (result.xp.awarded > 0) {
        setXpReward({
          key: Date.now(),
          points: result.xp.awarded,
          courseCompleted: result.xp.courseBonusAwarded > 0,
        });
        window.setTimeout(() => setXpReward(null), 2600);
      }
      if (result.xp.courseBonusAwarded > 0) {
        setCompletionState(
          `¡Curso completado! Ganaste +${result.xp.lessonAwarded} XP por la lección y `
          + `+${result.xp.courseBonusAwarded} XP de bono. Ya tienes ${result.xp.total} XP.`,
        );
      } else if (result.xp.lessonAwarded > 0) {
        setCompletionState(
          `Lección completada: +${result.xp.lessonAwarded} XP. `
          + `Tu curso va en ${Math.round(result.progress.percentage)}% y ya tienes ${result.xp.total} XP.`,
        );
      } else {
        setCompletionState(
          `Esta lección ya estaba completada. Conservas tus ${result.xp.total} XP sin puntos duplicados.`,
        );
      }
    } catch (requestError) {
      setCompletionError(true);
      setCompletionState(requestError.message);
    } finally {
      setSavingCompletion(false);
    }
  };

  const uncompleteLesson = async () => {
    if (!course?.id || !lesson?.id) return;
    setSavingCompletion(true);
    setCompletionState('');
    setCompletionError(false);
    try {
      const result = await gamificationService.uncompleteLesson(course.id, lesson.id);
      setLessonProgressState(await gamificationService.courseLessonStatus(course.id));
      setCompletionState(
        `Lección marcada como pendiente. El curso queda en ${Math.round(result.progress.percentage)}%. `
        + `Tus ${result.xp.total} XP permanecen guardados.`,
      );
    } catch (requestError) {
      setCompletionError(true);
      setCompletionState(requestError.message);
    } finally {
      setSavingCompletion(false);
    }
  };

  const refreshLessonProgress = async () => {
    if (!course?.id) return;
    try {
      setLessonProgressState(await gamificationService.courseLessonStatus(course.id));
      setProgressStateError('');
    } catch (requestError) {
      setProgressStateError(requestError.message);
    }
  };

  return (
    <div className="courses-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        {loading ? (
          <div className="course-state course-state--page"><Loader label="Cargando lección" /></div>
        ) : !course || !lesson || !resourceAllowed('course', course.id) ? (
          <div className="course-state course-state--page">
            <h1>Lección no disponible para tu beca</h1>
            <p>{error || 'El curso que contiene esta lección está bloqueado para tu tipo de beca.'}</p>
            <Link className="course-button" to={course ? `/cursos/${slug}` : '/cursos'}>
              {course ? 'Volver al curso' : 'Volver a cursos'}
            </Link>
          </div>
        ) : (
          <section className="course-lesson-layout">
            <aside className="lesson-sidebar" aria-label="Navegación del curso">
              <Link className="lesson-sidebar-back" to={`/cursos/${slug}`}>← Ver inicio del curso</Link>
              <h2>{course.title}</h2>
              <p className="lesson-sidebar-count">{lessons.length} lecciones</p>

              <nav>
                {modules.map((module) => (
                  <details
                    className="lesson-module-nav"
                    key={`${module.title}-${number}`}
                    defaultOpen={module.lessons.some((item) => Number(item.number) === Number(number))}
                  >
                    <summary>{module.title} <span>{module.lessons.length}</span></summary>
                    <ol>
                      {module.lessons.map((item, index) => {
                        const current = Number(item.number) === Number(number);
                        const itemProgress = lessonProgressById.get(String(item.id));
                        return (
                          <li
                            className={[
                              current ? 'current' : '',
                              itemProgress?.completed ? 'completed' : '',
                              itemProgress?.locked ? 'locked' : '',
                            ].filter(Boolean).join(' ')}
                            key={item.id || item.number}
                          >
                            <Link
                              to={`/cursos/${slug}/lecciones/${item.number}`}
                              aria-current={current ? 'page' : undefined}
                            >
                              <span aria-hidden="true">
                                {itemProgress?.completed ? '✓' : itemProgress?.locked ? '🔒' : index + 1}
                              </span>
                              {item.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                ))}
              </nav>
            </aside>

            <article className="course-lesson-detail">
              <Link className="course-back" to={`/cursos/${slug}`}>← Volver al curso</Link>
              <p className="eyebrow">{lesson.module || 'Módulo del curso'}</p>
              <h1>{lesson.title}</h1>
              <p className="course-lesson-position">
                Lección {currentIndex + 1} de {lessons.length}
              </p>
              <div className="course-lesson-progress" aria-label={`Progreso de la ruta: ${Math.round(progress)}%`}>
                <span style={{ width: `${progress}%` }} />
              </div>

              <section className="course-lesson-content" aria-label="Contenido de la lección">
                {safeContent ? (
                  <div className="course-rich-content" dangerouslySetInnerHTML={{ __html: safeContent }} />
                ) : lesson.summary ? (
                  <p>{lesson.summary}</p>
                ) : (
                  <p>
                    Esta lección forma parte de la ruta de aprendizaje de <strong>{course.title}</strong>.
                    El contenido formativo se incorporará en esta sección.
                  </p>
                )}
              </section>

              {isAuthenticated && <LessonReadingTimer
                courseId={course.id}
                lessonId={lesson.id}
                initialTimer={currentLessonProgress?.timer}
                onUpdate={setReadingTimer}
              />}

              {isAuthenticated && <LessonExam
                lessonId={lesson.id}
                isAuthenticated={isAuthenticated}
                onPassed={refreshLessonProgress}
              />}

              <section className="lesson-completion" aria-labelledby="completar-leccion">
                {xpReward && (
                  <div className="xp-reward-animation" key={xpReward.key} role="status">
                    <span aria-hidden="true">{xpReward.courseCompleted ? '🏆' : '★'}</span>
                    <strong>+{xpReward.points} XP</strong>
                    <small>{xpReward.courseCompleted ? '¡Curso completado!' : '¡Lección completada!'}</small>
                  </div>
                )}
                <div className="lesson-completion-heading">
                  <span className="lesson-xp-emblem" aria-hidden="true">XP</span>
                  <div>
                    <p>RECOMPENSA DE APRENDIZAJE</p>
                    <h2 id="completar-leccion">Completa esta lección</h2>
                  </div>
                </div>
                <p>
                  Avanza en orden. Esta lección entrega <strong>+100 XP</strong> y completar
                  todo el curso añade un bono de <strong>+500 XP</strong>.
                </p>
                {isAuthenticated ? (
                  <>
                    <div className="lesson-completion-actions">
                      <button
                        className="lesson-xp-button"
                        type="button"
                        disabled={
                          savingCompletion
                          || progressStateLoading
                          || !currentLessonProgress
                          || Boolean(progressStateError)
                          || currentLessonProgress?.locked
                          || (effectiveTimer?.enabled && !effectiveTimer.ready)
                          || (currentLessonProgress?.exam && !currentLessonProgress.exam.passed)
                        }
                        onClick={currentLessonProgress?.completed ? uncompleteLesson : completeLesson}
                      >
                        <span aria-hidden="true">
                          {currentLessonProgress?.completed
                            ? '✓'
                            : currentLessonProgress?.locked
                              ? '🔒'
                              : '★'}
                        </span>
                        <span>
                          {savingCompletion
                            ? 'Guardando progreso…'
                            : progressStateLoading || !currentLessonProgress
                              ? 'Verificando avance…'
                              : currentLessonProgress?.completed
                                ? 'Marcar lección como no completada'
                                : currentLessonProgress?.locked
                                  ? 'Lección bloqueada'
                                  : effectiveTimer?.enabled && !effectiveTimer.ready
                                    ? `Cumple ${Math.max(1, Math.ceil(effectiveTimer.remainingSeconds / 60))} min de lectura`
                                  : currentLessonProgress?.exam && !currentLessonProgress.exam.passed
                                    ? `Aprueba el examen con ${currentLessonProgress.exam.passingScore}%`
                                    : 'Completar lección y ganar 100 XP'}
                          {!savingCompletion
                            && !progressStateLoading
                            && currentLessonProgress
                            && !currentLessonProgress?.completed
                            && !currentLessonProgress?.locked
                            && (!effectiveTimer?.enabled || effectiveTimer.ready)
                            && (!currentLessonProgress?.exam || currentLessonProgress.exam.passed)
                            && <small>Haz clic cuando termines de estudiar</small>}
                        </span>
                      </button>
                      <Link to="/cursos/gamificacion">Ver mi avance en cursos →</Link>
                    </div>
                    {currentLessonProgress?.locked && (
                      <div className="lesson-sequence-notice">
                        <span aria-hidden="true">🔒</span>
                        <p>
                          Para obtener estos XP, completa primero la lección{' '}
                          <Link
                            to={`/cursos/${slug}/lecciones/${currentLessonProgress.requiredLesson.number}`}
                          >
                            {currentLessonProgress.requiredLesson.number}: {currentLessonProgress.requiredLesson.title}
                          </Link>.
                        </p>
                      </div>
                    )}
                    {currentLessonProgress?.exam
                      && !currentLessonProgress.exam.passed
                      && !currentLessonProgress?.locked && (
                      <div className="lesson-sequence-notice">
                        <span aria-hidden="true">📝</span>
                        <p>
                          Aprueba la evaluación con al menos{' '}
                          <strong>{currentLessonProgress.exam.passingScore}%</strong>{' '}
                          para desbloquear esta recompensa.
                        </p>
                      </div>
                    )}
                    {effectiveTimer?.enabled && !effectiveTimer.ready && !currentLessonProgress?.locked && (
                      <div className="lesson-sequence-notice">
                        <span aria-hidden="true">⏱</span>
                        <p>Activa el cronómetro y estudia el contenido durante el tiempo mínimo para desbloquear esta recompensa.</p>
                      </div>
                    )}
                    {currentLessonProgress?.completed && (
                      <div className="lesson-sequence-notice lesson-sequence-notice--completed">
                        <span aria-hidden="true">✓</span>
                        <p>Esta recompensa ya está guardada. Puedes desmarcar la lección para repetirla; tus XP no se retirarán ni volverán a sumarse.</p>
                      </div>
                    )}
                    {progressStateError && (
                      <p className="gamification-feedback error" role="alert">{progressStateError}</p>
                    )}
                    {completionState && (
                      <p className={`gamification-feedback${completionError ? ' error' : ''}`} role="status">
                        {completionState}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="lesson-completion-actions">
                    <Link className="lesson-xp-login" to="/login">
                      Inicia sesión y completa la lección · +100 XP
                    </Link>
                  </div>
                )}
              </section>

              <nav className="course-lesson-navigation" aria-label="Navegación entre lecciones">
                {previous
                  ? <Link to={`/cursos/${slug}/lecciones/${previous.number}`}>← Anterior</Link>
                  : <span />}
                {next
                  ? <Link to={`/cursos/${slug}/lecciones/${next.number}`}>Siguiente →</Link>
                  : <Link to={`/cursos/${slug}`}>Finalizar ruta</Link>}
              </nav>
            </article>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
