/**
 * @file Componente `ForumsPage`.
 *
 * Fija el título del documento a «Foros — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 * Consume: `forumsService`.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { forumCatalog, forumReference } from '@/data/forumCatalog';
import { forumsService } from '@/services/forumsService';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import '@/forums.css';

/** Fecha y hora en formato corto. No valida el valor recibido. */
const formatDate = (value) => new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

/**
 * Completa un foro de la API con su presentacion del catalogo fijo.
 *
 * El orden de la mezcla importa: los datos de la API se aplican **despues**, asi
 * que ganan sobre el catalogo y este solo rellena lo que falte (icono,
 * descripcion). Un foro cuyo slug no este en el catalogo se queda sin adorno.
 */
const decorateForum = (forum) => {
  const reference = forumReference(forum.slug);
  return {
    ...reference,
    ...forum,
    icon: forum.icon || reference?.icon || '💬',
    description: forum.description || reference?.description,
  };
};

/**
 * Indice de foros con los ultimos temas de cada uno.
 */
export default function ForumsPage() {
  const { resourceAllowed } = useMembershipAccess();
  const [forums, setForums] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const visibleForums = forums.filter((forum) => resourceAllowed('forum', forum.id));
  const visibleTopics = topics.filter((topic) => resourceAllowed('forum', topic.forum_id));

  useEffect(() => {
    let active = true;
    Promise.all([forumsService.listForums(), forumsService.latestTopics()])
      .then(([forumRows, topicRows]) => {
        if (!active) return;
        setForums((forumRows.length ? forumRows : forumCatalog).map(decorateForum));
        setTopics(topicRows);
      })
      .catch((requestError) => {
        if (!active) return;
        setForums(forumCatalog.map((forum) => ({ ...forum, topics_count: 0 })));
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Foros — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="forums-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        <section className="forums-page">
          <header className="forums-heading">
            <p className="eyebrow">Comunidad CABSA</p>
            <h1>Foros temáticos</h1>
            <p>Comparte ideas, recursos y experiencias con la comunidad educativa.</p>
          </header>

          {error && (
            <div className="forums-alert">
              {error} Mostramos temporalmente el directorio disponible.
            </div>
          )}

          <section aria-labelledby="foros-disponibles">
            <h2 id="foros-disponibles">Explora las comunidades</h2>
            {loading ? (
              <div className="forum-state"><Loader label="Cargando foros" /></div>
            ) : (
              <div className="forums-directory">
                {visibleForums.map((forum) => (
                  <Link className="forum-directory-card" to={`/foros/${forum.slug}`} key={forum.slug}>
                    <span className="forum-directory-icon" aria-hidden="true">{forum.icon}</span>
                    <span>
                      <strong>{forum.title}</strong>
                      <small>{forum.topics_count || 0} temas</small>
                      <em>{forum.description}</em>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="forums-latest" aria-labelledby="temas-recientes">
            <div className="forums-section-heading">
              <h2 id="temas-recientes">Temas recientes</h2>
              <span>Actividad de la comunidad</span>
            </div>
            {visibleTopics.length ? visibleTopics.map((topic) => (
              <Link className="forum-topic-row" to={`/foros/tema/${topic.slug}`} key={topic.id || topic.slug}>
                <span aria-hidden="true">▸</span>
                <strong>{topic.title}</strong>
                <small>{formatDate(topic.created_at)}</small>
              </Link>
            )) : (
              <p className="forum-empty">Todavía no hay temas publicados.</p>
            )}
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}
