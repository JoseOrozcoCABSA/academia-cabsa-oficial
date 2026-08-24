/**
 * @file Componente `ForumTopicPage`.
 *
 * Consume: `forumsService`.
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { forumsService } from '@/services/forumsService';
import { sanitizeContentHtml } from '@/utils/sanitizeContentHtml';
import { useAuth } from '@/hooks/useAuth';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import '@/forums.css';

/** Fecha y hora en formato medio. No valida el valor recibido. */
const formatDate = (value) => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

/**
 * Tema del foro con sus respuestas y el formulario para responder.
 *
 * Responder exige sesion.
 */
export default function ForumTopicPage() {
  const { slug } = useParams();
  const { isAuthenticated, user } = useAuth();
  const { resourceAllowed } = useMembershipAccess();
  const location = useLocation();
  const [topic, setTopic] = useState(null);
  const [forum, setForum] = useState(null);
  const [replies, setReplies] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    forumsService.findTopicBySlug(slug)
      .then(async (result) => {
        const [forumRow, replyRows] = await Promise.all([
          forumsService.findForumById(result.forum_id),
          forumsService.listReplies(result.id),
        ]);
        if (active) {
          setTopic(result);
          setForum(forumRow);
          setReplies(replyRows);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
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
    document.title = topic?.title
      ? `${topic.title} — Academia CABSA`
      : 'Tema del foro — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, [topic]);

  const safeContent = useMemo(
    () => sanitizeContentHtml(topic?.content || ''),
    [topic?.content],
  );

  /**
   * Publica una respuesta y recarga el hilo.
   *
   * Se recarga en lugar de anadir la respuesta al estado local, de modo que lo
   * que se ve es lo que quedo guardado.
   */
  const submitReply = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await forumsService.createReply({
        topicId: topic.id,
        forumId: topic.forum_id,
        content,
        user,
      });
      setReplies((current) => [...current, created]);
      setContent('');
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
          <div className="forum-state forum-state--page"><Loader label="Cargando tema" /></div>
        ) : !topic || !forum || !resourceAllowed('forum', topic.forum_id) ? (
          <div className="forum-state forum-state--page">
            <h1>Tema no encontrado</h1>
            <p>{error || 'El tema solicitado no está disponible.'}</p>
            <Link className="forum-button" to="/foros">Volver a foros</Link>
          </div>
        ) : (
          <section className="forums-page">
            <Link className="forum-back" to={`/foros/${forum.slug}`}>← Volver al foro</Link>

            <article className="forum-detail-header forum-topic-header">
              <p className="eyebrow">{forum.title}</p>
              <h1>{topic.title}</h1>
              <p>Por {topic.author_name || 'Comunidad CABSA'} · {formatDate(topic.created_at)}</p>
              {safeContent ? (
                <div className="forum-post-content" dangerouslySetInnerHTML={{ __html: safeContent }} />
              ) : (
                <p className="forum-post-content">{topic.content}</p>
              )}
            </article>

            {error && <div className="forums-alert">{error}</div>}

            <section className="forums-latest" aria-labelledby="respuestas-tema">
              <div className="forums-section-heading">
                <h2 id="respuestas-tema">Respuestas</h2>
                <span>{replies.length} aportaciones</span>
              </div>
              {replies.length ? replies.map((reply) => (
                <article className="forum-reply" key={reply.id}>
                  <strong>{reply.author_name || 'Comunidad CABSA'}</strong>
                  <small>{formatDate(reply.created_at)}</small>
                  <p>{reply.content}</p>
                </article>
              )) : (
                <p className="forum-empty">Aún no hay respuestas.</p>
              )}
            </section>

            {isAuthenticated ? (
              <section className="forums-latest forum-compose">
                <h2>Responder</h2>
                <form onSubmit={submitReply}>
                  <label>
                    Tu respuesta
                    <textarea
                      value={content}
                      maxLength={10000}
                      required
                      onChange={(event) => setContent(event.target.value)}
                    />
                  </label>
                  <button className="forum-button" type="submit" disabled={submitting}>
                    {submitting ? 'Enviando…' : 'Enviar respuesta'}
                  </button>
                </form>
              </section>
            ) : (
              <div className="forum-login-callout">
                <p>Inicia sesión para responder a este tema.</p>
                <Link className="forum-button" to="/login" state={{ from: location.pathname }}>
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
