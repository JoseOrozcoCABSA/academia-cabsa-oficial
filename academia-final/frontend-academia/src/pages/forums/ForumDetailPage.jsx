/**
 * @file Componente `ForumDetailPage`.
 *
 * Consume: `forumsService`.
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { forumReference } from '@/data/forumCatalog';
import { forumsService } from '@/services/forumsService';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import { useAuth } from '@/hooks/useAuth';
import '@/forums.css';

/**
 * Fecha y hora en formato corto.
 *
 * No comprueba el valor: un dato invalido se muestra como `Invalid Date`.
 */
const formatDate = (value) => new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

/**
 * Foro concreto con sus temas y el formulario para abrir uno nuevo.
 *
 * Publicar exige sesion; sin ella se muestra la invitacion a entrar en lugar del
 * formulario.
 */
export default function ForumDetailPage() {
  const { resourceAllowed } = useMembershipAccess();
  const { slug } = useParams();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [forum, setForum] = useState(null);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    forumsService.findForumBySlug(slug)
      .then(async (result) => {
        const topicRows = await forumsService.listTopics(result.id);
        if (active) {
          setForum({
            ...forumReference(slug),
            ...result,
            description: result.description || forumReference(slug)?.description,
          });
          setTopics(topicRows);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        const fallback = forumReference(slug);
        setForum(fallback ? { ...fallback, topics_count: 0 } : null);
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
    document.title = forum?.title
      ? `${forum.title} — Academia CABSA`
      : 'Foro — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, [forum]);

  /**
   * Crea un tema y refresca la lista.
   *
   * El slug se genera en el cliente a partir del titulo, y no se comprueba que
   * sea unico: dos temas con el mismo titulo producen el mismo slug.
   */
  const submitTopic = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await forumsService.createTopic({
        forumId: forum.id,
        title: form.title,
        content: form.content,
        user,
      });
      navigate(`/foros/tema/${created.slug}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forums-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        {loading ? (
          <div className="forum-state forum-state--page"><Loader label="Cargando foro" /></div>
        ) : !forum || !resourceAllowed('forum', forum.id) ? (
          <div className="forum-state forum-state--page">
            <h1>Foro no disponible para tu beca</h1>
            <p>{error || 'Esta comunidad está bloqueada para tu tipo de beca.'}</p>
            <Link className="forum-button" to="/foros">Volver a foros</Link>
          </div>
        ) : (
          <section className="forums-page forum-detail-page">
            <Link className="forum-back" to="/foros">← Volver a foros</Link>
            <header className="forum-detail-header">
              <span className="forum-detail-icon" aria-hidden="true">{forum.icon || '💬'}</span>
              <p className="eyebrow">Comunidad CABSA</p>
              <h1>{forum.title}</h1>
              <p>{forum.description}</p>
              <strong>{topics.length} temas publicados</strong>
            </header>

            {error && <div className="forums-alert">{error}</div>}

            <section className="forums-latest" aria-labelledby="temas-foro">
              <div className="forums-section-heading">
                <h2 id="temas-foro">Temas del foro</h2>
                <span>Consulta y participa</span>
              </div>
              {topics.length ? topics.map((topic) => (
                <Link className="forum-topic-row" to={`/foros/tema/${topic.slug}`} key={topic.id || topic.slug}>
                  <span aria-hidden="true">▸</span>
                  <strong>{topic.title}</strong>
                  <small>{formatDate(topic.created_at)}</small>
                </Link>
              )) : (
                <p className="forum-empty">Este foro aún no tiene temas. Sé la primera persona en participar.</p>
              )}
            </section>

            {isAuthenticated && forum.id ? (
              <section className="forums-latest forum-compose">
                <h2>Crear un nuevo tema</h2>
                <p>Comparte una pregunta, experiencia o recurso con esta comunidad.</p>
                <form onSubmit={submitTopic}>
                  <label>
                    Título
                    <input
                      value={form.title}
                      maxLength={80}
                      required
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    Mensaje
                    <textarea
                      value={form.content}
                      maxLength={10000}
                      required
                      onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                    />
                  </label>
                  <button className="forum-button" type="submit" disabled={submitting}>
                    {submitting ? 'Publicando…' : 'Publicar tema'}
                  </button>
                </form>
              </section>
            ) : (
              <div className="forum-login-callout">
                <p>Inicia sesión para crear un tema y participar en la comunidad.</p>
                <Link
                  className="forum-button"
                  to="/login"
                  state={{ from: `${location.pathname}${location.search}` }}
                >
                  Iniciar sesión
                </Link>
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
