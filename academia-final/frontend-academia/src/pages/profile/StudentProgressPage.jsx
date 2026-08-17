import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { profileService } from '@/services/profileService';
import '@/profile-cabsa.css';
import '@/teacher-students.css';

const formatDate = (value, fallback = 'Sin actividad') => {
  if (!value || String(value).startsWith('1900-01-01')) return fallback;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};
const statusLabel = (status) => ({ COMPLETED: 'Completado', ACTIVE: 'En curso', IN_PROGRESS: 'En progreso', NOT_STARTED: 'Sin iniciar', SUSPENDED: 'Suspendido', CANCELLED: 'Cancelado' }[status] || status);

export default function StudentProgressPage() {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      let resolvedGroupId = groupId;
      if (!resolvedGroupId) {
        const overview = await profileService.getManagedGroup();
        const groups = overview?.groups || [];
        const matching = groups.find((group) => (group.students || []).some(
          (student) => String(student.id) === String(studentId),
        ));
        resolvedGroupId = matching?.id || (groups.length === 1 ? groups[0].id : null);
      }
      if (!resolvedGroupId) {
        throw new Error('No fue posible identificar el grupo de este alumno. Vuelve a abrirlo desde Mis alumnos.');
      }
      return profileService.getStudentProgress(studentId, resolvedGroupId);
    };
    load()
      .then((result) => { if (active) setReport(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId, studentId]);
  useEffect(() => {
    const previous = document.title;
    document.title = 'Progreso del alumno — Academia CABSA';
    return () => { document.title = previous; };
  }, []);

  const summary = report?.summary;
  return <div className="profile-cabsa-public teacher-students-public">
    <a className="skip-link" href="#contenido">Saltar al contenido principal</a><Header />
    <main id="contenido"><section className="profile-cabsa-page student-progress-page">
      <nav className="teacher-students-breadcrumb" aria-label="Navegación secundaria"><Link to="/perfil">Mi cuenta</Link><span>/</span><Link to="/mis-alumnos">Mis alumnos</Link><span>/</span><strong>Progreso</strong></nav>
      {loading ? <div className="profile-cabsa-state"><Loader label="Preparando informe de progreso" /></div> : error ? <section className="profile-cabsa-card teacher-empty"><h1>No fue posible abrir este informe</h1><p className="profile-cabsa-alert" role="alert">{error}</p><Link className="profile-cabsa-button" to="/mis-alumnos">Volver a mis alumnos</Link></section> : report && <>
        <header className="profile-cabsa-hero student-progress-hero">
          <div><p className="eyebrow">Seguimiento individual · {report.student.group_name}</p><h1>{report.student.display_name}</h1><p>{report.student.email} · Última actividad: {formatDate(summary.lastActivity)}</p></div>
          <span className={`profile-status profile-status--${String(report.student.status).toLowerCase()}`}>{report.student.status}</span>
        </header>
        <section className="student-progress-summary" aria-label="Resumen del alumno">
          <article><span>Cursos completados</span><strong>{summary.completedCourses} de {summary.courses}</strong><small>{summary.courses - summary.completedCourses} en curso o pendientes</small></article>
          <article><span>Lecciones completadas</span><strong>{summary.completedLessons} de {summary.lessons}</strong><small>{summary.lessons ? Math.round(summary.completedLessons / summary.lessons * 100) : 0}% de avance</small></article>
          <article><span>Cápsulas realizadas</span><strong>{summary.capsules} de {summary.totalCapsules}</strong><small>{summary.pendingCapsules} pendientes</small></article>
          <article><span>Participación en foros</span><strong>{report.forumParticipated ? 'Sí' : 'No'}</strong><small>{summary.forumTopics} temas · {summary.forumReplies} respuestas</small></article>
        </section>
        <section className="profile-cabsa-card student-course-section">
          <header><div><p className="eyebrow">Avance actual</p><h2>Cursos y lecciones</h2></div><p>Resumen directo por curso.</p></header>
          {!report.courses.length ? <div className="teacher-empty"><h3>Sin cursos inscritos</h3><p>El alumno todavía no registra inscripciones.</p></div> : <div className="student-course-brief-list">{report.courses.map((course) => <article key={course.enrollment_id} className="student-course-brief"><div><strong>{course.title}</strong><span>{statusLabel(course.status)} · {course.completed_lessons} de {course.total_lessons} lecciones</span></div><div className="student-course-progress"><b>{course.progress_percent}%</b><span>Última actividad: {formatDate(course.last_activity)}</span></div></article>)}</div>}
        </section>
        <section className="profile-cabsa-card student-capsule-section">
          <header><div><p className="eyebrow">Progreso registrado</p><h2>Cápsulas realizadas</h2></div><p>{summary.capsules} de {summary.totalCapsules} cápsulas.</p></header>
          {!report.capsules.length ? <p>El alumno todavía no registra avance en cápsulas.</p> : <div className="student-capsule-list">{report.capsules.map((capsule) => <article key={capsule.id}><i className={`capsule-status capsule-status--${String(capsule.semaphore_status).toLowerCase()}`} aria-hidden="true" /><div><strong>{capsule.title}</strong><span>{capsule.category} · {capsule.progress_percent}%</span></div><time>{formatDate(capsule.updated_at)}</time></article>)}</div>}
        </section>
      </>}
    </section></main><Footer />
  </div>;
}
