/**
 * @file Componente `CourseGamificationPage`.
 *
 * Fija el título del documento a «Gamificación de cursos — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 * Consume: `gamificationService`.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { gamificationService } from '@/services/gamificationService';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import '@/gamification.css';

/** Fecha corta, o cadena vacia si no hay valor. */
const formatDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

/** Progreso y puntos por curso del usuario en sesion. */
export default function CourseGamificationPage() {
  const { resourceAllowed } = useMembershipAccess();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const permittedItems = (summary?.items || []).filter((item) => resourceAllowed('course', item.id));

  /** Pide el resumen de cursos con su progreso y sus puntos. */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSummary(await gamificationService.courseSummary());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    document.title = 'Gamificación de cursos — Academia CABSA';
  }, [load]);

  return (
    <div className="gamification-page gamification-page--courses">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />
      <main id="contenido">
        <section className="gamification-shell">
          <header className="gamification-hero gamification-hero--courses">
            <div>
              <p className="gamification-eyebrow">Aprende, avanza y sube de nivel</p>
              <h1>Gamificación de cursos</h1>
              <p>
                Obtén XP al completar cada lección, recibe un bono al terminar
                un curso y conserva una racha visible de aprendizaje.
              </p>
              <Link className="gamification-primary-button" to="/cursos">
                Explorar cursos
              </Link>
            </div>
            <div className="gamification-score" aria-label={`Nivel ${summary?.xp?.level || 1}`}>
              <small>NIVEL</small>
              <strong>{summary?.xp?.level || 1}</strong>
              <span>{summary?.xp?.total || 0} XP acumulados</span>
            </div>
          </header>

          {loading ? (
            <div className="gamification-state"><Loader label="Calculando tus puntos XP" /></div>
          ) : error ? (
            <div className="gamification-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={load}>Intentar de nuevo</button>
            </div>
          ) : (
            <div className="course-gamification-layout">
              <div className="course-learning-panel">
                <section className="gamification-metrics gamification-metrics--courses" aria-label="Resumen de cursos">
                  <article>
                    <span>Cursos activos</span>
                    <strong>{summary.activeCourses}</strong>
                    <small>rutas en desarrollo</small>
                  </article>
                  <article>
                    <span>Cursos terminados</span>
                    <strong>{summary.completedCourses}</strong>
                    <small>bonos obtenidos</small>
                  </article>
                  <article>
                    <span>Lecciones completadas</span>
                    <strong>{summary.completedLessons}</strong>
                    <small>de {summary.availableLessons} disponibles</small>
                  </article>
                </section>

                <section className="gamification-history course-progress-history">
                  <header>
                    <div>
                      <p className="gamification-eyebrow">Mis rutas de aprendizaje</p>
                      <h2>Avance por curso</h2>
                    </div>
                    <span className="course-global-progress">{summary.percentage}% global</span>
                  </header>

                  {permittedItems.length ? (
                    <div className="course-progress-grid">
                      {permittedItems.map((course) => (
                        <article className="course-progress-card" key={course.id}>
                          {course.image
                            ? <img src={course.image} alt="" />
                            : <div className="course-progress-placeholder">CABSA</div>}
                          <div className="course-progress-card-body">
                            <div className="course-progress-card-heading">
                              <span>{course.category || 'Curso Academia CABSA'}</span>
                              <b>{course.earned_xp} XP</b>
                            </div>
                            <h3>{course.title}</h3>
                            <div
                              className="course-progress-line"
                              aria-label={`${Math.round(course.progress_percent)}% completado`}
                            >
                              <span style={{ width: `${course.progress_percent}%` }} />
                            </div>
                            <p>
                              <strong>{course.completed_lessons}</strong> de {course.total_lessons} lecciones
                              <b>{Math.round(course.progress_percent)}%</b>
                            </p>
                            <Link to={`/cursos/${course.slug}`}>
                              {course.status === 'COMPLETED' ? 'Repasar curso' : 'Continuar curso'} →
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="gamification-empty">
                      <h3>Aún no has iniciado un curso</h3>
                      <p>Elige una ruta: tu primera lección completada te dará 100 XP.</p>
                      <Link to="/cursos">Descubrir cursos</Link>
                    </div>
                  )}
                </section>
              </div>

              <aside className="course-xp-panel" aria-label="Resumen de experiencia">
                <p className="gamification-eyebrow">Tu experiencia</p>
                <div className="xp-level-heading">
                  <span aria-hidden="true">★</span>
                  <div>
                    <small>Nivel actual</small>
                    <strong>Nivel {summary.xp.level}</strong>
                  </div>
                </div>
                <div className="xp-total">
                  <strong>{summary.xp.total}</strong>
                  <span>XP totales</span>
                </div>
                <div className="xp-level-copy">
                  <span>{summary.xp.currentLevelXp} XP</span>
                  <span>{summary.xp.nextLevelXp} XP</span>
                </div>
                <div className="xp-progress-track" aria-label={`${summary.xp.levelProgressPercent}% hacia el siguiente nivel`}>
                  <span style={{ width: `${summary.xp.levelProgressPercent}%` }} />
                </div>
                <p className="xp-next-level">
                  Te faltan {summary.xp.nextLevelXp - summary.xp.currentLevelXp} XP para el nivel {summary.xp.level + 1}.
                </p>

                <div className="xp-rewards">
                  <article>
                    <span>Lección completada</span>
                    <strong>+{summary.xp.rewards.lesson} XP</strong>
                  </article>
                  <article>
                    <span>Curso completado</span>
                    <strong>+{summary.xp.rewards.course} XP</strong>
                  </article>
                </div>

                <div className="course-streak-compact">
                  <span aria-hidden="true">🔥</span>
                  <div>
                    <small>Racha actual</small>
                    <strong>{summary.streak.current} días</strong>
                  </div>
                  <div>
                    <small>Mejor racha</small>
                    <strong>{summary.streak.longest} días</strong>
                  </div>
                </div>

                <section className="xp-events">
                  <h2>XP recientes</h2>
                  {summary.xp.recentEvents.length ? (
                    <ol>
                      {summary.xp.recentEvents.map((event) => (
                        <li key={event.id}>
                          <span className="xp-event-icon" aria-hidden="true">
                            {event.event_type === 'COURSE_COMPLETED' ? '🏆' : '✓'}
                          </span>
                          <div>
                            <strong>{event.description}</strong>
                            <small>{formatDate(event.earned_at)}</small>
                          </div>
                          <b>+{event.points}</b>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>Completa una lección para estrenar tu marcador de XP.</p>
                  )}
                </section>
              </aside>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
