/**
 * @file Servicio `coursesService` del frontend.
 *
 * Se apoya en `academiaService`, que a su vez llama al gateway.
 *
 * Operaciones (3):
 * - `listPublishedCourses()`
 * - `findCourseBySlug(slug)`
 * - `listCourseLessons(courseId)`
 *
 * Los errores se propagan como `Error` con el mensaje del backend:
 * quien llame debe capturarlos y mostrarlos.
 */

import { academiaService } from '@/services/academiaService';

/** Serializa los filtros a cadena de consulta, con el escapado resuelto. */
const listQuery = (values) => {
  const params = new URLSearchParams(values);
  return `?${params.toString()}`;
};

/**
 * Genera lecciones de relleno a partir del numero declarado en el curso.
 *
 * Se usa con los cursos del catalogo de reserva, que traen la cuenta de
 * lecciones pero no las lecciones. Sirve para que el indice del curso se pinte
 * con la longitud correcta, aunque **sin contenido**: `content` y `summary` van
 * nulos a proposito.
 *
 * Un curso con la cuenta en cero produce un arreglo vacio.
 */
const referenceLessons = (course) => Array.from(
  { length: Number(course.lessons || course.lesson_count || 0) },
  (_, index) => ({
    id: `${course.id}-${index + 1}`,
    course_id: course.id,
    number: index + 1,
    slug: `leccion-${index + 1}`,
    title: `Lección ${index + 1} · Contenido formativo`,
    module: 'Contenido del curso',
    summary: null,
    content: null,
  }),
);

/**
 * Consultas de cursos y lecciones del catalogo publico.
 *
 * Todas filtran por `status: 'published'`, de modo que los borradores no llegan
 * a la academia.
 */
export const coursesService = {
  async listPublishedCourses() {
    return academiaService.list('courses', listQuery({
      status: 'published',
      limit: '100',
      orderBy: 'published_at',
      orderDirection: 'DESC',
    }));
  },

  async findCourseBySlug(slug) {
    const courses = await academiaService.list('courses', listQuery({
      slug,
      status: 'published',
      limit: '1',
    }));
    if (!courses.length) throw new Error('El curso solicitado no está disponible.');
    return courses[0];
  },

  listCourseLessons(courseId) {
    return academiaService.list('lessons', listQuery({
      course_id: String(courseId),
      limit: '500',
      orderBy: 'number',
      orderDirection: 'ASC',
    }));
  },

  referenceLessons,
};
