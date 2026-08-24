import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Edit3, FileQuestion, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { academiaService } from '@/services/academiaService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, EmptyState, Loader } from '@/components/common';
import './lessons-page.css';

export default function LessonsPage() {
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('');
  const loader = useCallback(async () => {
    const [lessons, courses] = await Promise.all([
      academiaService.list('lessons', '?limit=500&orderBy=course_id'),
      academiaService.list('courses', '?limit=100&orderBy=title'),
    ]);
    return [{ lessons, courses }];
  }, []);
  const { items, loading, error, reload } = useRemoteList(loader, []);
  const { lessons = [], courses = [] } = items[0] || {};
  const courseMap = useMemo(() => new Map(courses.map((course) => [String(course.id), course])), [courses]);
  const visible = useMemo(() => lessons.filter((lesson) => {
    if (courseId && String(lesson.course_id) !== courseId) return false;
    const course = courseMap.get(String(lesson.course_id));
    return `${lesson.title} ${lesson.module || ''} ${course?.title || ''}`.toLowerCase().includes(search.toLowerCase());
  }), [courseId, courseMap, lessons, search]);

  return <div className="page admin-page lessons-admin-page">
    <div className="page-heading"><div><p className="eyebrow">academia-service</p><h1>Lecciones y exámenes</h1><p>Edita el contenido de cada lección y construye evaluaciones calificadas.</p></div><Button variant="secondary" onClick={reload}><RefreshCw /> Actualizar</Button></div>
    <div className="lessons-toolbar">
      <label className="search search--page"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lección, módulo o curso" /></label>
      <select value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Todos los cursos</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
      <span>{visible.length} lecciones</span>
    </div>
    {error && <div className="alert alert--error">{error}</div>}
    {loading ? <section className="card"><Loader label="Cargando lecciones" /></section> : visible.length ? <section className="lessons-admin-list">{visible.map((lesson) => {
      const course = courseMap.get(String(lesson.course_id));
      return <article className="card lesson-admin-card" key={lesson.id}>
        <span className="lesson-admin-number">{lesson.number}</span>
        <div><div className="lesson-admin-labels"><Badge tone="gold">{lesson.module || 'Sin módulo'}</Badge><small>{course?.title || `Curso #${lesson.course_id}`}</small></div><h2>{lesson.title}</h2><p>{lesson.summary || 'Sin resumen de lección.'}</p></div>
        <div className="lesson-admin-actions">
          <Link className="button button--primary" to={`/academia/cursos/${lesson.course_id}/lecciones/${lesson.id}/examen`}><FileQuestion /> Crear o editar examen</Link>
          <Link className="button button--secondary" to={`/academia/cursos/${lesson.course_id}/editar`}><Edit3 /> Editar contenido</Link>
        </div>
      </article>;
    })}</section> : <section className="card"><EmptyState title="No hay lecciones" description="Cambia los filtros o crea lecciones desde el editor de cursos." action={<Link className="button button--primary" to="/academia/cursos"><BookOpen /> Ir a cursos</Link>} /></section>}
  </div>;
}
