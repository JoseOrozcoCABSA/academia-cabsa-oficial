/**
 * @file Componente `MediaLibraryPage`.
 *
 * Fija el título del documento a «Mediateca — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 * Consume: `contentService`.
 *
 * Usa `useRemoteList` con un catálogo de reserva: si la API falla o
 * responde vacío, la pantalla muestra datos estáticos en lugar de
 * quedar en blanco. El indicador `usingReference` es la única señal
 * de que lo mostrado no viene del servidor.
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useRemoteList } from '@/hooks/useRemoteList';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import { contentService } from '@/services/contentService';
import { capsules as referenceCapsules } from '@/data/referenceCatalog';
import '@/mediateca.css';

const pageSize = 10;

/** Fecha de publicacion en formato largo, o cadena vacia si no hay valor. */
const publishedDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

/**
 * Mediateca publica de capsulas, con busqueda, filtro por categoria y paginado.
 *
 * El paginado es sobre lo ya cargado, no del servidor: se piden todas las
 * capsulas publicadas y se reparten en paginas en el navegador.
 */
export default function MediaLibraryPage() {
  const { isAuthenticated } = useAuth();
  /** Carga fija de las capsulas publicadas. */
  const load = useCallback(() => contentService.listPublishedCapsules(), []);
  const { items, loading, error, usingReference } = useRemoteList(load, referenceCapsules);
  const { resourceAllowed } = useMembershipAccess();
  const permittedItems = useMemo(() => items.filter((item) => resourceAllowed('capsule', item.id)), [items, resourceAllowed]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Mediateca — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, category]);

  /**
   * Categorias deducidas de las capsulas cargadas, ordenadas en espanol. Una
   * categoria sin capsulas publicadas no aparece en el filtro.
   */
  const categories = useMemo(() => (
    [...new Set(permittedItems.map((item) => item.category).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'es'))
  ), [permittedItems]);

  /**
   * Filtra por texto y categoria sobre lo cargado.
   *
   * Busca en titulo, resumen y categoria. Compara en minusculas pero **no
   * ignora los acentos**.
   */
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return permittedItems.filter((item) => {
      const inCategory = !category || item.category === category;
      const searchable = `${item.title || ''} ${item.summary || ''} ${item.category || ''}`
        .toLocaleLowerCase('es');
      return inCategory && (!normalized || searchable.includes(normalized));
    });
  }, [permittedItems, query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="mediateca-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        <section className="capsules-catalog">
          <div className="catalog-heading">
            <p className="eyebrow">Mediateca</p>
            <h1>Cápsulas educativas</h1>
            <p>Microespacios de aprendizaje dinámicos para introducir, sensibilizar o reforzar temas clave.</p>
          </div>

          {error && (
            <div className="mediateca-alert">
              {error} Mostramos temporalmente el contenido local disponible.
            </div>
          )}
          {usingReference && !error && (
            <div className="mediateca-note">Contenido académico local de referencia.</div>
          )}

          <div className="capsulas-container">
            <div className="capsulas-list">
              {loading ? (
                <Loader label="Cargando Mediateca" />
              ) : visibleItems.length ? visibleItems.map((capsule) => {
                const slug = capsule.slug || capsule.id;
                return (
                  <article className="capsule-list-item" key={slug}>
                    <Link className="capsule-list-thumbnail" to={`/mediateca/${slug}`}>
                      {capsule.image
                        ? <img src={capsule.image} alt={capsule.title} loading="lazy" />
                        : <span>CABSA</span>}
                    </Link>
                    <div className="capsule-list-content">
                      <p className="capsule-list-category">{capsule.category || 'Cápsulas Educativas'}</p>
                      <h2><Link to={`/mediateca/${slug}`}>{capsule.title}</Link></h2>
                      <p>{capsule.summary}</p>
                      {capsule.published_at && <small>{publishedDate(capsule.published_at)}</small>}
                      <Link className="capsule-read-more" to={`/mediateca/${slug}`}>Leer cápsula →</Link>
                    </div>
                  </article>
                );
              }) : (
                <div className="mediateca-empty">No encontramos cápsulas con esos criterios.</div>
              )}

              {totalPages > 1 && (
                <nav className="capsulas-pagination" aria-label="Paginación de cápsulas">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                    <button
                      type="button"
                      key={number}
                      className={number === page ? 'active' : ''}
                      aria-current={number === page ? 'page' : undefined}
                      onClick={() => {
                        setPage(number);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {number}
                    </button>
                  ))}
                </nav>
              )}
            </div>

            <aside className="capsulas-filter" aria-label="Filtrar cápsulas">
              <label className="capsules-search-label" htmlFor="capsule-search">Buscar</label>
              <input
                id="capsule-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Título, tema o categoría"
              />

              <h2>Categorías</h2>
              <div className="capsulas-categories">
                <label>
                  <input
                    type="radio"
                    name="category"
                    value=""
                    checked={!category}
                    onChange={() => setCategory('')}
                  />
                  <span>Todas las categorías</span>
                </label>
                {categories.map((item) => (
                  <label key={item}>
                    <input
                      type="radio"
                      name="category"
                      value={item}
                      checked={category === item}
                      onChange={() => setCategory(item)}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>

              {(category || query) && (
                <button
                  className="capsules-clear-filter"
                  type="button"
                  onClick={() => {
                    setCategory('');
                    setQuery('');
                  }}
                >
                  Limpiar filtros
                </button>
              )}

              <div className="capsulas-creator-link">
                <strong>Creador de cápsulas</strong>
                <p>Convierte una idea o un tema en una cápsula educativa con apoyo de IA.</p>
                <a
                  className="mediateca-button"
                  href="https://chatgpt.com/g/g-69655cd3e4248191804ab4ceb9262dd6-creador-de-capsulas-educativas-academia-cabsa"
                  target="_blank"
                  rel="noreferrer"
                >
                  Crear una cápsula ↗
                </a>
              </div>

              <div className="capsulas-gamification-link">
                <strong>Semáforo de aprendizaje</strong>
                <p>Consulta qué cápsulas comprendiste, cuáles debes reforzar y dónde necesitas apoyo.</p>
                <Link className="mediateca-button mediateca-button--secondary" to={isAuthenticated ? '/capsulas/gamificacion' : '/login'}>
                  Ver mi gamificación
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
