/**
 * @file Componente `CapsuleSemaphorePage`.
 *
 * Fija el título del documento a «Gamificación de cápsulas — Academia CABSA» mientras está
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

const filters = [
  { value: '', label: 'Todas' },
  { value: 'GREEN', label: '🟢 Comprendidas' },
  { value: 'YELLOW', label: '🟡 Por reforzar' },
  { value: 'RED', label: '🔴 Necesito apoyo' },
];

const semaphoreMeta = {
  GREEN: {
    emoji: '🟢',
    label: 'Comprendida',
    feedback: 'Esta cápsula quedó marcada como comprendida. Puedes continuar con nuevas actividades.',
  },
  YELLOW: {
    emoji: '🟡',
    label: 'Por reforzar',
    feedback: 'Esta cápsula quedó marcada para reforzar. Conviene repasarla antes de avanzar.',
  },
  RED: {
    emoji: '🔴',
    label: 'Necesito apoyo',
    feedback: 'Esta cápsula quedó marcada como apoyo necesario. Sería ideal revisarla con orientación.',
  },
};

/**
 * Formatea una fecha de actividad.
 *
 * A los valores que son solo fecha (`AAAA-MM-DD`) les anade las doce del
 * mediodia antes de convertirlos. Sin eso el navegador los interpreta como
 * medianoche UTC y, en las zonas al oeste, **la fecha se mostraria un dia
 * antes**, con lo que la racha parecia empezar el dia equivocado.
 */
const formatActivityDate = (value, withTime = false) => {
  if (!value) return '';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}T12:00:00`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
};

/**
 * Mensaje de animo segun la racha actual.
 *
 * Los cortes son 7 y 3 dias. Solo texto: no influye en puntos ni en progreso.
 */
const constancyMessage = (streak) => {
  if (streak.current >= 7) {
    return 'Excelente constancia. Has mantenido una racha fuerte de aprendizaje.';
  }
  if (streak.current >= 3) {
    return 'Muy buen ritmo. Tu constancia empieza a consolidarse.';
  }
  if (streak.activeDays >= 1) {
    return 'Ya comenzaste tu ruta. Cada día activo cuenta para construir hábito.';
  }
  return 'Cuando empieces a completar cápsulas, aquí aparecerá tu constancia.';
};

/**
 * Progreso de capsulas por color del semaforo, con la racha de actividad.
 */
export default function CapsuleSemaphorePage() {
  const { resourceAllowed } = useMembershipAccess();
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Pide el resumen al servidor, filtrado por color.
   *
   * El filtro se aplica en el backend y no en el cliente, asi que cambiarlo
   * dispara una peticion nueva.
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSummary(await gamificationService.capsuleSummary(filter));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = 'Gamificación de cápsulas — Academia CABSA';
  }, []);

  const percentage = summary?.percentage || 0;
  const permittedItems = (summary?.items || []).filter((item) => resourceAllowed('capsule', item.id));

  return (
    <div className="gamification-page gamification-page--semaphore">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />
      <main id="contenido">
        <section className="semaphore-dashboard">
          <div className="gamification-sections">
          <div className="semaphore-dashboard-box gamification-capsules-panel">
            <header className="semaphore-dashboard-hero">
              <div>
                <span className="semaphore-dashboard-label">Gamificación CABSA</span>
                <h1>Cápsulas y semáforo</h1>
                <p>
                  Revisa las cápsulas completadas y las áreas que puedes
                  reforzar para continuar aprendiendo.
                </p>
              </div>

              <div className="semaphore-percentage" aria-label={`${percentage}% de avance general`}>
                <strong>{percentage}%</strong>
                <span>avance general</span>
              </div>
            </header>

            <div className="semaphore-progress" aria-label={`Progreso total: ${percentage}%`}>
              <span style={{ width: `${percentage}%` }} />
            </div>

            {loading ? (
              <div className="gamification-state"><Loader label="Calculando tu avance" /></div>
            ) : error ? (
              <div className="gamification-error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={load}>Intentar de nuevo</button>
              </div>
            ) : (
              <>
                <section className="semaphore-summary-grid" aria-label="Resumen de avance">
                  <article className="semaphore-summary-card semaphore-summary-card--principal">
                    <strong>{summary.completed}</strong>
                    <span>Cápsulas completadas</span>
                  </article>
                  <article className="semaphore-summary-card">
                    <strong>{summary.available}</strong>
                    <span>Cápsulas disponibles</span>
                  </article>
                  <article className="semaphore-summary-card">
                    <strong>{summary.percentage}%</strong>
                    <span>Progreso total</span>
                  </article>
                </section>

                <section className="semaphore-color-grid" aria-labelledby="resumen-semaforo">
                  <h2 id="resumen-semaforo">Mi semáforo de aprendizaje</h2>
                  <p>Los colores muestran cómo valoraste tu comprensión al terminar cada cápsula.</p>
                  <div>
                    <article className="semaphore-color-card semaphore-color-card--green">
                      <span aria-hidden="true" />
                      <strong>{summary.semaphore.GREEN}</strong>
                      <small>Comprendidas</small>
                    </article>
                    <article className="semaphore-color-card semaphore-color-card--yellow">
                      <span aria-hidden="true" />
                      <strong>{summary.semaphore.YELLOW}</strong>
                      <small>Por reforzar</small>
                    </article>
                    <article className="semaphore-color-card semaphore-color-card--red">
                      <span aria-hidden="true" />
                      <strong>{summary.semaphore.RED}</strong>
                      <small>Necesito apoyo</small>
                    </article>
                  </div>
                </section>

                <section className="semaphore-history" aria-labelledby="capsulas-completadas">
                  <header>
                    <div>
                      <h2 id="capsulas-completadas">Mis cápsulas completadas</h2>
                      <p>
                        Cada tarjeta representa una cápsula registrada. Puedes
                        volver a abrirla para repasar o reforzar tu aprendizaje.
                      </p>
                    </div>
                    <div className="gamification-filters" aria-label="Filtrar cápsulas por color">
                      {filters.map((item) => (
                        <button
                          className={filter === item.value ? 'active' : ''}
                          key={item.value || 'all'}
                          type="button"
                          onClick={() => setFilter(item.value)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </header>

                  {permittedItems.length ? (
                    <div className="semaphore-capsule-grid">
                      {permittedItems.map((item) => {
                        const status = semaphoreMeta[item.semaphore_status] || semaphoreMeta.GREEN;
                        return (
                          <article className="semaphore-capsule-card" key={item.id}>
                            <Link className="semaphore-capsule-image" to={`/capsulas/${item.slug}`}>
                              {item.image ? (
                                <img src={item.image} alt="" loading="lazy" />
                              ) : (
                                <span aria-hidden="true">CABSA</span>
                              )}
                            </Link>
                            <div className="semaphore-capsule-body">
                              <span className="semaphore-capsule-category">
                                {item.category || 'Cápsula educativa'}
                              </span>
                              <h3><Link to={`/capsulas/${item.slug}`}>{item.title}</Link></h3>
                              <p className="semaphore-capsule-summary">{item.summary}</p>
                              <div className={`semaphore-capsule-status semaphore-capsule-status--${item.semaphore_status.toLowerCase()}`}>
                                <span aria-hidden="true">{status.emoji}</span>
                                <strong>{status.label}</strong>
                              </div>
                              <p className="semaphore-capsule-feedback">{status.feedback}</p>
                              <small>Registrada el {formatActivityDate(item.updated_at)}</small>
                              <Link className="semaphore-capsule-button" to={`/capsulas/${item.slug}`}>
                                Ver cápsula
                              </Link>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="gamification-empty">
                      <h3>{filter ? 'No hay cápsulas en este color' : 'Aún no hay cápsulas completadas'}</h3>
                      <p>
                        Cuando registres el semáforo de una cápsula, aparecerá
                        aquí como parte de tu ruta de aprendizaje.
                      </p>
                      <Link to="/mediateca">Explorar cápsulas</Link>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          <aside className="gamification-streak-panel" aria-labelledby="racha-dias-titulo">
            <span className="semaphore-dashboard-label">Constancia CABSA</span>
            <h2 id="racha-dias-titulo">Racha de días</h2>
            <p>Tu actividad diaria construye un hábito de aprendizaje constante.</p>

            {loading ? (
              <div className="streak-panel-state"><Loader label="Calculando tu racha" /></div>
            ) : error ? (
              <div className="streak-panel-state">
                <span aria-hidden="true">🔥</span>
                <strong>Sin datos disponibles</strong>
              </div>
            ) : (
              <>
                <div className="streak-main-number">
                  <span aria-hidden="true">🔥</span>
                  <strong>{summary.streak.current}</strong>
                  <small>{summary.streak.current === 1 ? 'día de racha actual' : 'días de racha actual'}</small>
                </div>

                <div className="streak-stat-grid">
                  <article>
                    <strong>{summary.streak.activeDays}</strong>
                    <span>Días activos</span>
                  </article>
                  <article>
                    <strong>{summary.streak.longest}</strong>
                    <span>Mejor racha</span>
                  </article>
                </div>

                <div className="streak-message">
                  <strong>Tu constancia</strong>
                  <p>{constancyMessage(summary.streak)}</p>
                </div>

                {summary.streak.lastActivity && (
                  <div className="streak-last-activity">
                    <span>Última actividad</span>
                    <strong>{formatActivityDate(summary.streak.lastActivity)}</strong>
                  </div>
                )}

                <Link className="streak-capsule-link" to="/mediateca">
                  Continuar aprendiendo →
                </Link>
              </>
            )}
          </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
