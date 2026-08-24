/**
 * @file Componente `CapsuleDetailPage`.
 *
 * Consume: `contentService`, `gamificationService`.
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { contentService } from '@/services/contentService';
import { capsules as referenceCapsules } from '@/data/referenceCatalog';
import { sanitizeContentHtml } from '@/utils/sanitizeContentHtml';
import { useAuth } from '@/hooks/useAuth';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import { gamificationService } from '@/services/gamificationService';
import { parseCapsuleSemaphore } from '@/utils/capsuleSemaphore';
import '@/mediateca.css';
import '@/gamification.css';

const semaphoreLabels = [
  { value: 'GREEN', color: 'verde', emoji: '🟢', label: 'Verde' },
  { value: 'YELLOW', color: 'amarillo', emoji: '🟡', label: 'Amarillo' },
  { value: 'RED', color: 'rojo', emoji: '🔴', label: 'Rojo' },
];

/**
 * Detalle de una capsula, con su contenido y el semaforo de autoevaluacion.
 *
 * El HTML de la capsula pasa por `sanitizeContentHtml` antes de pintarse, y el
 * semaforo se extrae del propio contenido con `parseCapsuleSemaphore`.
 */
export default function CapsuleDetailPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const { resourceAllowed } = useMembershipAccess();
  const [capsule, setCapsule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [semaphoreStatus, setSemaphoreStatus] = useState('');
  const [savingSemaphore, setSavingSemaphore] = useState(false);
  const [semaphoreFeedback, setSemaphoreFeedback] = useState('');
  const [semaphoreError, setSemaphoreError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    contentService.findCapsuleBySlug(slug)
      .then((result) => {
        if (active) setCapsule(result);
      })
      .catch((requestError) => {
        if (!active) return;
        // Si la API falla se cae al catalogo estatico; se muestra tambien el
        // error, asi que lo visible puede no ser el contenido real.
        const fallback = referenceCapsules.find((item) => item.id === slug);
        setCapsule(fallback ?? null);
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = capsule?.title
      ? `${capsule.title} — Academia CABSA`
      : 'Cápsula educativa — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, [capsule]);

  useEffect(() => {
    if (!isAuthenticated || !capsule?.id) return undefined;
    let active = true;
    gamificationService.capsuleSummary()
      .then((summary) => {
        if (!active) return;
        const saved = summary.items?.find(
          (item) => String(item.id) === String(capsule.id),
        );
        if (saved?.semaphore_status) {
          setSemaphoreStatus(saved.semaphore_status);
          setSemaphoreFeedback(`Semáforo guardado: ${saved.semaphore_status === 'GREEN' ? 'Verde' : saved.semaphore_status === 'YELLOW' ? 'Amarillo' : 'Rojo'}.`);
        }
      })
      .catch(() => {
        // La cápsula continúa disponible aunque no sea posible recuperar el avance.
      });
    return () => {
      active = false;
    };
  }, [capsule?.id, isAuthenticated]);

  const semaphore = useMemo(
    () => parseCapsuleSemaphore(capsule?.body || ''),
    [capsule?.body],
  );
  const safeBody = useMemo(
    () => sanitizeContentHtml(semaphore.cleanHtml),
    [semaphore.cleanHtml],
  );

  /**
   * Guarda la autoevaluacion del usuario.
   *
   * Actualiza el estado local antes de que responda el servidor para que la
   * seleccion se sienta inmediata. Si la peticion falla, **el color elegido se
   * queda pintado** aunque no se haya guardado: solo el mensaje avisa.
   *
   * Sale sin hacer nada si aun no hay capsula cargada o no se eligio color.
   */
  const saveSemaphore = async (nextStatus = semaphoreStatus) => {
    if (!capsule?.id || !nextStatus) return;
    setSemaphoreStatus(nextStatus);
    setSavingSemaphore(true);
    setSemaphoreFeedback('');
    setSemaphoreError(false);
    try {
      await gamificationService.completeCapsule(capsule.id, nextStatus);
      const color = nextStatus === 'GREEN'
        ? 'Verde'
        : nextStatus === 'YELLOW'
          ? 'Amarillo'
          : 'Rojo';
      setSemaphoreFeedback(`Semáforo guardado: ${color}. Ya aparece en tu avance.`);
    } catch (requestError) {
      setSemaphoreError(true);
      setSemaphoreFeedback(requestError.message);
    } finally {
      setSavingSemaphore(false);
    }
  };

  return (
    <div className="mediateca-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        {loading ? (
          <div className="capsule-detail-state"><Loader label="Cargando cápsula" /></div>
        ) : !capsule || !resourceAllowed('capsule', capsule.id) ? (
          <div className="capsule-detail-state">
            <h1>Cápsula no disponible para tu beca</h1>
            <p>{error || 'Esta cápsula no forma parte de los contenidos habilitados para tu tipo de beca.'}</p>
            <Link className="mediateca-button" to="/mediateca">Volver a la Mediateca</Link>
          </div>
        ) : (
          <article className="capsule-detail">
            <Link className="capsule-back" to="/mediateca">← Volver a cápsulas</Link>
            <p className="eyebrow">{capsule.category || 'Cápsulas Educativas'}</p>
            <h1>{capsule.title}</h1>

            {capsule.image && (
              <img className="capsule-detail-image" src={capsule.image} alt={capsule.title} />
            )}

            <p className="capsule-detail-lead">{capsule.summary}</p>

            {safeBody ? (
              <div className="capsule-rich-content" dangerouslySetInnerHTML={{ __html: safeBody }} />
            ) : (
              <div className="capsule-rich-content">
                <p>
                  Esta cápsula forma parte de la Mediateca de Academia CABSA.
                  Explora el contenido, comparte tus ideas y aplica lo aprendido
                  en tu contexto educativo.
                </p>
              </div>
            )}

            <section className="capsule-assessment" aria-labelledby="semaforo-capsula">
              <p className="semaphore-kicker">
                {semaphore.hasSemaphore ? 'Autoevaluación de esta cápsula' : 'Autoevaluación general'}
              </p>
              <h2 id="semaforo-capsula">Semáforo de aprendizaje</h2>
              <p>Selecciona el color que mejor represente cómo comprendiste esta cápsula.</p>

              <div className="capsule-assessment-options" role="group" aria-label="Seleccionar color del semáforo">
                {semaphoreLabels.map((option) => (
                  <button
                    className={`semaphore-option semaphore-${option.color}${semaphoreStatus === option.value ? ' selected' : ''}`}
                    key={option.value}
                    type="button"
                    aria-pressed={semaphoreStatus === option.value}
                    onClick={() => {
                      setSemaphoreStatus(option.value);
                      setSemaphoreFeedback('');
                      if (isAuthenticated) void saveSemaphore(option.value);
                    }}
                  >
                    <span className="semaphore-option-heading">
                      <i aria-hidden="true">{option.emoji}</i>
                      {option.label}
                    </span>
                    <small>{semaphore.options[option.value]}</small>
                  </button>
                ))}
              </div>

              {isAuthenticated ? (
                <>
                  <div className="capsule-assessment-actions">
                    <span className={`semaphore-save-state${savingSemaphore ? ' saving' : ''}`}>
                      {savingSemaphore
                        ? 'Guardando tu selección…'
                        : semaphoreStatus
                          ? 'La selección se guarda automáticamente.'
                          : 'Selecciona un color para guardar tu avance.'}
                    </span>
                    {semaphoreError && (
                      <button type="button" onClick={() => saveSemaphore()} disabled={savingSemaphore}>
                        Reintentar guardado
                      </button>
                    )}
                    <Link to="/capsulas/gamificacion">Ver mi gamificación →</Link>
                  </div>
                  {semaphoreFeedback && (
                    <p className={`gamification-feedback${semaphoreError ? ' error' : ''}`} role="status">
                      {semaphoreFeedback}
                    </p>
                  )}
                </>
              ) : (
                <div className="capsule-assessment-actions">
                  <Link className="mediateca-button" to="/login">
                    Inicia sesión para guardar tu avance
                  </Link>
                </div>
              )}
            </section>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
}
