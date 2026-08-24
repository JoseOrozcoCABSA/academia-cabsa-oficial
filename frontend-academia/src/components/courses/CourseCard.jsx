/**
 * @file Componente `CourseCard`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/common';
/**
 * Tarjeta de curso del listado.
 *
 * Enlaza por `slug` y cae al `id` si no lo hay, porque los cursos del catalogo
 * de reserva no tienen slug. La imagen tiene una de respaldo para que la
 * cuadricula no quede con huecos.
 */
export default function CourseCard({ course }) {
  const id = course.slug || course.id;
  return <article className="course-card"><img src={course.image || course.thumbnail_url || '/assets/images/bootcamp.png'} alt="" /><div><Badge tone="gold">{course.category || 'Curso CABSA'}</Badge><h3>{course.title || course.name}</h3><p>{course.summary || course.description || 'Contenido formativo de Academia CABSA.'}</p><div className="progress-row"><span><BookOpen /> {course.lessons || course.lesson_count || 0} lecciones</span><span>{course.progress || 0}%</span></div><div className="progress"><i style={{ width: `${course.progress || 0}%` }} /></div><Link to={`/cursos/${id}`}>Ver curso <ArrowRight /></Link></div></article>;
}
