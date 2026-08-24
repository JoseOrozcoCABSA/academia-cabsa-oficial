/**
 * @file Componente `LandingPage`.
 *
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { useAuth } from '@/hooks/useAuth';
import { assistants, capsules, courses } from '@/data/referenceCatalog';
import { forumCatalog } from '@/data/forumCatalog';
import { contentService } from '@/services/contentService';
import { coursesService } from '@/services/coursesService';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import '@/landing.css';

/**
 * Portada publica de la academia.
 *
 * Carga novedades, cursos y cápsulas publicados; los catálogos locales quedan
 * como respaldo. Los accesos cambian de destino según haya sesión o no.
 */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { active: membershipActive, allowed, resourceAllowed } = useMembershipAccess();
  const [blogEntries, setBlogEntries] = useState([]);
  const [homeCourses, setHomeCourses] = useState(courses);
  const [homeCapsules, setHomeCapsules] = useState(capsules);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      contentService.listPublishedBlog(),
      coursesService.listPublishedCourses(),
      contentService.listPublishedCapsules(),
    ]).then(([blogResult, coursesResult, capsulesResult]) => {
      if (!active) return;
      if (blogResult.status === 'fulfilled') setBlogEntries(sortNewestFirst(blogResult.value));
      if (coursesResult.status === 'fulfilled' && coursesResult.value.length) {
        setHomeCourses(sortNewestFirst(coursesResult.value));
      }
      if (capsulesResult.status === 'fulfilled' && capsulesResult.value.length) {
        setHomeCapsules(sortNewestFirst(capsulesResult.value));
      }
    });
    return () => { active = false; };
  }, []);
  /**
   * Los asistentes y los tutores se separan por el campo `kind`, comparado con
   * una cadena literal. Cambiar la etiqueta en el catalogo vacia la seccion sin
   * que falle nada.
   */
  const assistantsByLevel = assistants.filter((item) => item.kind === 'Asistente IA');
  /** Tutores virtuales, misma separacion por `kind`. */
  const tutorsByLevel = assistants.filter((item) => item.kind === 'Tutor virtual');
  const canOpenModule = (permission) => isAuthenticated && allowed(permission);
  const cardLink = (path, permission, resourceEnabled = true) => (
    canOpenModule(permission) && resourceEnabled ? { to: path } : null
  );

  /**
   * Destino de un acceso que requiere sesion.
   *
   * Sin sesion lleva al inicio de sesion **y guarda la ruta pretendida** en el
   * estado de navegacion, que es lo que permite volver alli despues de entrar.
   *
   * No es una medida de seguridad, solo de comodidad: quien escriba la URL a
   * mano llega igual, y lo que protege de verdad es la guarda de ruta.
   */
  const protectedTarget = (path) => ({
    to: isAuthenticated ? path : '/login',
    state: isAuthenticated ? undefined : { from: path },
  });

  return (
    <div className="landing">
      <Header />

      <main id="main-content" className="landing-main">
        <section className="home-hero">
          <div className="home-hero-grid">
            <div className="video-frame">
              <iframe
                src="https://www.youtube-nocookie.com/embed/1fGxmvGZ1fU?rel=0"
                title="Academia CABSA"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div className="home-hero-copy">
              <h1>Tecnologías Inteligentes: Empoderando a Profesores, Alumnos y Familias.</h1>
              <p>Explora una amplia variedad de recursos educativos pensados para docentes, estudiantes y familias. Accede a cursos y materiales que impulsan tu desarrollo profesional y potencian tu crecimiento personal, emocional y social.</p>
              {membershipActive === false && <Link className="button" {...protectedTarget('/activar-beca')}>Activa tu Beca</Link>}
            </div>
          </div>
        </section>

        {blogEntries.length > 0 && <section className="section home-section home-section--blog" id="novedades">
          <p className="eyebrow">Actualidad CABSA</p><h2>Novedades de la Academia</h2><p className="lead">Noticias, comunicados y recursos recientes para nuestra comunidad educativa.</p>
          <BlogCarousel entries={blogEntries} />
        </section>}

        <section className="section home-section home-section--virtual" id="asistentes">
          <h2>Asistentes Virtuales</h2>
          <p className="lead">Herramientas de Inteligencia Artificial diseñadas para apoyar y fortalecer la práctica de los docentes por nivel educativo. Actúan como aliados especializados en la planeación, evaluación formativa y creación de estrategias didácticas alineadas a los principios de la Nueva Escuela Mexicana (NEM), permitiendo al profesor ahorrar tiempo de carga operativa y potenciar la innovación en el aula.</p>
          <div className="home-card-grid">
            {assistantsByLevel.map((card) => (
              <HomeCard
                key={card.id}
                title={card.title}
                description={card.description}
                image={card.image}
                link={cardLink(`/ai/asistentes/${card.id}`, 'assistants')}
                preview={!canOpenModule('assistants')}
              />
            ))}
          </div>
        </section>

        <section className="section home-section home-section--virtual" id="tutores">
          <h2>Tutores Virtuales</h2>
          <p className="lead">Espacios de acompañamiento inteligente orientados a estudiantes y familias por nivel educativo. Están diseñados para guiar el aprendizaje autónomo de los alumnos y ayudar a resolver dudas puntuales, complementando el trabajo en el aula y apoyando el proceso educativo desde casa.</p>
          <div className="home-card-grid">
            {tutorsByLevel.map((card) => (
              <HomeCard
                key={card.id}
                title={card.title}
                description={card.description}
                image={card.image}
                link={cardLink(`/ai/tutores/${card.id.replace('tutor-', '')}`, 'tutors')}
                preview={!canOpenModule('tutors')}
              />
            ))}
          </div>
        </section>

        <section className="section home-section" id="cursos">
          <h2>Catálogo de Cursos</h2>
          <p className="lead">Un catálogo que crece junto contigo, enfocado en cursos cortos o microcursos de modalidad asincrónica. Diseñados para que avances a tu propio ritmo, estos recursos te brindan habilidades prácticas mediante materiales breves, autogestivos y altamente aplicables a tu entorno.</p>
          <div className="home-card-grid">
            {homeCourses.slice(0, 6).map((course) => {
              const courseEnabled = canOpenModule('courses') && resourceAllowed('course', course.id);
              return (
              <HomeCard
                key={course.id}
                title={course.title}
                description={course.summary}
                image={course.image}
                link={cardLink(`/cursos/${encodeURIComponent(course.slug || course.id)}`, 'courses', courseEnabled)}
                cta={courseEnabled ? 'Ver curso →' : undefined}
                preview={!courseEnabled}
              />
              );
            })}
          </div>
        </section>

        <section className="section home-section home-section--capsules" id="capsulas">
          <h2>⏱️ Cápsulas Educativas</h2>
          <p className="lead">Aprende lo esencial en minutos. Son microespacios de aprendizaje dinámicos (de 1 a 3 minutos de duración) creados para introducir, sensibilizar o reforzar temas clave de manera ágil y significativa. Cada cápsula está estructurada pedagógicamente para captar la atención, desarrollar conceptos y cerrar con una reflexión aplicable a la vida diaria.</p>
          <div className="home-card-grid">
            {homeCapsules.slice(0, 4).map((capsule) => {
              const capsuleEnabled = canOpenModule('media') && resourceAllowed('capsule', capsule.id);
              return (
              <HomeCard
                key={capsule.id}
                title={capsule.title}
                description={capsule.summary}
                image={capsule.image}
                link={cardLink(`/capsulas/${encodeURIComponent(capsule.slug || capsule.id)}`, 'media', capsuleEnabled)}
                cta={capsuleEnabled ? 'Leer cápsula →' : undefined}
                preview={!capsuleEnabled}
              />
              );
            })}
          </div>
        </section>

        <section className="section home-section forums-section" id="foros">
          <h2>💬 Foros Temáticos</h2>
          <p className="lead">Son espacios estructurados de diálogo y colaboración continua para la comunidad educativa, diseñados bajo el formato de “tema-respuesta” para el intercambio de conocimiento.</p>
          <div className="forum-grid">
            {forumCatalog.map((forum) => {
              const forumEnabled = canOpenModule('forums');
              const ForumCard = forumEnabled ? Link : 'article';
              return <ForumCard {...(forumEnabled ? { to: `/foros/${forum.slug}` } : {})} className={`forum-card${forumEnabled ? '' : ' forum-card--preview'}`} key={forum.slug}>
                <span>{forum.icon}</span>
                <h3>{forum.title}</h3>
                <p>{forum.description}</p>
              </ForumCard>;
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/** Ordena contenido publicado del más reciente al más antiguo. */
function sortNewestFirst(items) {
  return [...items].sort((left, right) => {
    const leftDate = Date.parse(left.published_at || left.created_at || left.updated_at || 0) || 0;
    const rightDate = Date.parse(right.published_at || right.created_at || right.updated_at || 0) || 0;
    return rightDate - leftDate;
  });
}

/** Carrusel de novedades: muestra hasta tres entradas y conserva las antiguas a la derecha. */
function BlogCarousel({ entries }) {
  const trackRef = useRef(null);
  const [position, setPosition] = useState(0);
  const [visibleCards, setVisibleCards] = useState(() => getVisibleBlogCards(entries.length));
  const lastPosition = Math.max(entries.length - visibleCards, 0);

  useEffect(() => {
    const updateVisibleCards = () => setVisibleCards(getVisibleBlogCards(entries.length));
    updateVisibleCards();
    window.addEventListener('resize', updateVisibleCards);
    return () => window.removeEventListener('resize', updateVisibleCards);
  }, [entries.length]);

  useEffect(() => {
    setPosition((currentPosition) => {
      const nextPosition = Math.min(currentPosition, lastPosition);
      scrollBlogTrack(trackRef.current, nextPosition, false);
      return nextPosition;
    });
  }, [lastPosition]);

  const moveTo = (nextPosition) => {
    const boundedPosition = Math.max(0, Math.min(nextPosition, lastPosition));
    setPosition(boundedPosition);
    scrollBlogTrack(trackRef.current, boundedPosition, true);
  };

  const syncPosition = () => {
    const track = trackRef.current;
    const firstCard = track?.children[0];
    const secondCard = track?.children[1];
    if (!track || !firstCard || !secondCard) return;
    const cardStep = secondCard.offsetLeft - firstCard.offsetLeft;
    if (cardStep > 0) setPosition(Math.min(Math.round(track.scrollLeft / cardStep), lastPosition));
  };

  return (
    <div className={`home-blog-carousel${entries.length === 1 ? ' home-blog-carousel--single' : ''}`}>
      {lastPosition > 0 && <button className="home-blog-arrow home-blog-arrow--previous" type="button" onClick={() => moveTo(position - 1)} disabled={position === 0} aria-label="Ver novedades más recientes"><ChevronLeft aria-hidden="true" /></button>}
      <div className="home-blog-track" ref={trackRef} onScroll={syncPosition} style={{ '--blog-columns': visibleCards }}>
        {entries.map((entry) => (
          <article className="home-blog-card" key={entry.id}>
            {entry.image && <Link to={`/novedades/${entry.slug}`}><img src={entry.image} alt="" loading="lazy" /></Link>}
            <div>
              <time>{entry.published_at ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(entry.published_at)) : 'Novedad'}</time>
              <h3><Link to={`/novedades/${entry.slug}`}>{entry.title}</Link></h3>
              <p>{entry.summary}</p>
              <Link className="home-blog-more" to={`/novedades/${entry.slug}`}>Leer más →</Link>
            </div>
          </article>
        ))}
      </div>
      {lastPosition > 0 && <button className="home-blog-arrow home-blog-arrow--next" type="button" onClick={() => moveTo(position + 1)} disabled={position === lastPosition} aria-label="Ver novedades anteriores"><ChevronRight aria-hidden="true" /></button>}
    </div>
  );
}

function getVisibleBlogCards(entryCount) {
  if (typeof window !== 'undefined' && window.innerWidth <= 620) return 1;
  if (typeof window !== 'undefined' && window.innerWidth <= 980) return Math.min(entryCount, 2);
  return Math.min(entryCount, 3);
}

function scrollBlogTrack(track, position, smooth) {
  const firstCard = track?.children[0];
  const targetCard = track?.children[position];
  if (!track || !firstCard || !targetCard) return;
  track.scrollTo({ left: targetCard.offsetLeft - firstCard.offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
}

/**
 * Tarjeta de la portada. `link` se derrama sobre el enlace, asi que acepta el
 * `to` y el `state` que produce {@link protectedTarget}.
 */
function HomeCard({ title, description, image, link, cta, preview = false }) {
  const Card = link ? Link : 'article';
  return (
    <Card className={`home-card${preview ? ' home-card--preview' : ''}`} {...(link || {})}>
      <img src={image} alt={title} loading="lazy" />
      <h3>{title}</h3>
      <p>{description}</p>
      {cta && <span>{cta}</span>}
      {preview && <small className="home-card-preview-label">{link ? '' : 'Vista informativa · acceso sujeto a tu cuenta y beca'}</small>}
    </Card>
  );
}
