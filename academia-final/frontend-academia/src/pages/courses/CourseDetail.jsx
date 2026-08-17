/**
 * @file Componente `CourseDetail`.
 *
 * Consume: `coursesService`.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { coursesService } from '@/services/coursesService';
import { courses as referenceCourses } from '@/data/referenceCatalog';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import '@/courses.css';

/**
 * Agrupa las lecciones en modulos conservando el orden de llegada.
 *
 * Las lecciones sin `module` van a un grupo generico para que ninguna quede
 * fuera del indice.
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
 * Ficha de un curso con su temario por modulos.
 *
 * Se localiza por `slug`. Si la API falla, cae al catalogo de reserva y genera
 * lecciones de relleno para que el temario mantenga su longitud.
 */
export default function CourseDetail() {
  const { slug } = useParams();
  const { resourceAllowed } = useMembershipAccess();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        // Respaldo del catalogo estatico; el temario que se pinte sera de
        // relleno, sin contenido real.
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

  useEffect(() => {
    const previousTitle = document.title;
    document.title = course?.title
      ? `${course.title} — Academia CABSA`
      : 'Curso — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, [course]);

  /** Temario agrupado por modulo. */
  const modules = useMemo(() => groupLessons(lessons), [lessons]);

  return (
    <div className="courses-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        {loading ? (
          <div className="course-state course-state--page"><Loader label="Cargando curso" /></div>
        ) : !course || !resourceAllowed('course', course.id) ? (
          <div className="course-state course-state--page">
            <h1>Curso no disponible para tu beca</h1>
            <p>{error || 'Este curso no forma parte de los contenidos habilitados para tu tipo de beca.'}</p>
            <Link className="course-button" to="/cursos">Volver a cursos</Link>
          </div>
        ) : (
          <article className="course-detail">
            <Link className="course-back" to="/cursos">← Volver a cursos</Link>
            <p className="eyebrow">
              Curso · {lessons.length ? `${lessons.length} lecciones` : 'Próximamente'}
            </p>
            <h1>{course.title}</h1>

            {course.image && (
              <img className="course-detail-image" src={course.image} alt="" width="1200" height="480" />
            )}

            <section className="course-objective">
              <h2>Objetivo del curso</h2>
              <p>{course.description || course.summary}</p>
              <Link className="course-progress-link" to="/cursos/gamificacion">
                Consultar mi avance en cursos →
              </Link>
            </section>

            <section className="course-modules" aria-labelledby="modulos-titulo">
              <header className="course-modules-title">
                <div>
                  <h2 id="modulos-titulo">Módulos y lecciones</h2>
                  <p>Selecciona una lección para acceder a su contenido.</p>
                </div>
                {lessons[0] && (
                  <Link className="course-button" to={`/cursos/${slug}/lecciones/${lessons[0].number}`}>
                    Comenzar curso →
                  </Link>
                )}
              </header>

              {modules.length ? modules.map((module) => (
                <article className="course-module" key={module.title}>
                  <header className="course-module-header">
                    <h3>{module.title}</h3>
                    <span>
                      {module.lessons.length} {module.lessons.length === 1 ? 'lección' : 'lecciones'}
                    </span>
                  </header>
                  <ol className="course-lessons-list">
                    {module.lessons.map((lesson, index) => (
                      <li key={lesson.id || lesson.number}>
                        <span className="course-lesson-number" aria-hidden="true">{index + 1}</span>
                        <Link
                          className="course-lesson-title"
                          to={`/cursos/${slug}/lecciones/${lesson.number}`}
                        >
                          {lesson.title}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </article>
              )) : (
                <p className="course-empty">Este curso aún no tiene lecciones publicadas. Vuelve pronto.</p>
              )}
            </section>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
}
