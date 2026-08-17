import { useEffect, useState } from 'react';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ExamBuilder from '@/components/exams/ExamBuilder';
import { Badge, Loader } from '@/components/common';
import { academiaService } from '@/services/academiaService';
import './course-editor.css';

export default function ExamEditorPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const courseEditorPath = `/academia/cursos/${courseId}/editar?tab=structure`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      academiaService.get('courses', courseId),
      academiaService.get('lessons', lessonId),
    ]).then(([currentCourse, currentLesson]) => {
      if (!active) return;
      if (String(currentLesson.course_id) !== String(courseId)) {
        throw new Error('La lección no pertenece al curso indicado.');
      }
      setCourse(currentCourse);
      setLesson(currentLesson);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [courseId, lessonId]);

  if (loading) return <div className="page admin-page"><section className="card"><Loader label="Preparando editor de examen" /></section></div>;
  if (error || !course || !lesson) return <div className="page admin-page"><Link className="back-link" to={courseEditorPath}><ArrowLeft /> Volver al curso</Link><div className="alert alert--error">{error || 'No fue posible encontrar la lección.'}</div></div>;

  return <div className="page admin-page exam-editor-page">
    <Link className="back-link" to={courseEditorPath}><ArrowLeft /> Volver a la estructura del curso</Link>
    <header className="course-editor-header exam-editor-header">
      <div>
        <div className="course-editor-status"><Badge tone="gold"><FileQuestion /> Examen</Badge><span>Lección {lesson.number}</span></div>
        <h1>{lesson.title}</h1>
        <p>{course.title} · Construye preguntas, respuestas y puntaje. El alumno puede intentarlo sin límite.</p>
      </div>
    </header>
    <ExamBuilder lesson={lesson} onClose={() => navigate(courseEditorPath)} />
  </div>;
}
