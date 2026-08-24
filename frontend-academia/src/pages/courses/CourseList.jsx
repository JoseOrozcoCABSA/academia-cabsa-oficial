/**
 * @file Componente `CourseList`.
 *
 * Fija el título del documento a «Cursos — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 * Consume: `coursesService`.
 *
 * Usa `useRemoteList` con un catálogo de reserva: si la API falla o
 * responde vacío, la pantalla muestra datos estáticos en lugar de
 * quedar en blanco. El indicador `usingReference` es la única señal
 * de que lo mostrado no viene del servidor.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { coursesService } from '@/services/coursesService';
import { courses as referenceCourses } from '@/data/referenceCatalog';
import { useRemoteList } from '@/hooks/useRemoteList';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import '@/courses.css';

const pageSize = 10;

/**
 * Catalogo publico de cursos con busqueda, filtro por categoria y paginado en
 * cliente.
 */
export default function CourseList() {
  /** Carga fija: se declara con `useCallback` para no reconsultar en cada render. */
  const load = useCallback(() => coursesService.listPublishedCourses(), []);
  const { items, loading, error, usingReference } = useRemoteList(load, referenceCourses);
  const { resourceAllowed } = useMembershipAccess();
  const permittedItems = useMemo(() => items.filter((course) => resourceAllowed('course', course.id)), [items, resourceAllowed]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Cursos — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, category]);

  /**
   * Categorias del desplegable, deducidas de los cursos cargados y no de un
   * catalogo: si ningun curso publicado tiene una categoria, esa opcion no
   * aparece.
   *
   * Se ordenan con `localeCompare` en espanol para que los acentos queden donde
   * se espera.
   */
  const categories = useMemo(() => (
    [...new Set(permittedItems.map((course) => course.category).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'es'))
  ), [permittedItems]);

  /**
   * Filtra en el cliente por texto y categoria sobre lo ya cargado.
   *
   * Busca en titulo, resumen y descripcion. Usa `toLocaleLowerCase('es')`, asi
   * que compara bien mayusculas y minusculas, pero **no ignora los acentos**:
   * «programacion» no encuentra «programación».
   */
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return permittedItems.filter((course) => {
      const inCategory = !category || course.category === category;
      const searchable = `${course.title || ''} ${course.summary || ''} ${course.description || ''}`
        .toLocaleLowerCase('es');
      return inCategory && (!normalized || searchable.includes(normalized));
    });
  }, [permittedItems, query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleCourses = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="courses-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        <section className="courses-catalog">
          <div className="courses-heading">
            <p className="eyebrow">Formación para crecer</p>
            <h1>Cursos de Academia CABSA</h1>
            <p>Catálogo formativo para docentes, estudiantes y familias, con contenidos prácticos y rutas de aprendizaje.</p>
          </div>

          {error && (
            <div className="courses-alert">
              {error} Mostramos temporalmente el catálogo local disponible.
            </div>
          )}
          {usingReference && !error && (
            <div className="courses-note">Catálogo académico local de referencia.</div>
          )}

          <div className="courses-container">
            <aside className="course-sidebar" aria-label="Filtrar cursos">
              <h2>Filtrar cursos</h2>
              <label className="course-search-label" htmlFor="course-search">Buscar cursos</label>
              <input
                id="course-search"
                type="search"
                value={query}
                maxLength={120}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej. finanzas, docencia…"
              />

              <fieldset className="course-checkboxes">
                <legend className="sr-only">Categoría</legend>
                <label>
                  <input
                    type="radio"
                    name="course-category"
                    checked={!category}
                    onChange={() => setCategory('')}
                  />
                  <strong>Todos</strong>
                </label>
                {categories.map((item) => (
                  <label key={item}>
                    <input
                      type="radio"
                      name="course-category"
                      value={item}
                      checked={category === item}
                      onChange={() => setCategory(item)}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </fieldset>

              {(category || query) && (
                <button
                  className="course-clear-filter"
                  type="button"
                  onClick={() => {
                    setCategory('');
                    setQuery('');
                  }}
                >
                  Limpiar filtros
                </button>
              )}

              <div className="course-gamification-link">
                <strong>Mi ruta de aprendizaje</strong>
                <p>Consulta cursos activos, lecciones completadas y tu racha de estudio.</p>
                <Link className="course-button" to="/cursos/gamificacion">
                  Ver mi avance
                </Link>
              </div>
            </aside>

            <div className="courses-list">
              {!loading && (
                <p className="course-results-count" role="status">
                  {filtered.length} {filtered.length === 1 ? 'curso' : 'cursos'}
                  {(query || category) ? ' con los filtros aplicados' : ''}
                </p>
              )}

              {loading ? (
                <div className="course-state"><Loader label="Cargando cursos" /></div>
              ) : visibleCourses.length ? visibleCourses.map((course) => {
                const slug = course.slug || course.id;
                const lessons = Number(course.lessons_count ?? course.lessons ?? course.lesson_count ?? 0);
                return (
                  <article className="course-list-item" key={slug}>
                    <Link
                      className="course-list-thumbnail"
                      to={`/cursos/${slug}`}
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      {course.image
                        ? <img src={course.image} alt="" width="300" height="200" loading="lazy" />
                        : <span>CABSA</span>}
                    </Link>
                    <div className="course-list-content">
                      {course.category && <p className="course-list-category">{course.category}</p>}
                      <h2><Link to={`/cursos/${slug}`}>{course.title || course.name}</Link></h2>
                      <p>{course.summary || course.description}</p>
                      <small><span aria-hidden="true">•</span> {lessons} lecciones</small>
                      <Link
                        className="course-read-more"
                        to={`/cursos/${slug}`}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        Ver curso →
                      </Link>
                    </div>
                  </article>
                );
              }) : (
                <div className="course-empty">No encontramos cursos con esos criterios.</div>
              )}

              {totalPages > 1 && (
                <nav className="courses-pagination" aria-label="Paginación de cursos">
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
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
