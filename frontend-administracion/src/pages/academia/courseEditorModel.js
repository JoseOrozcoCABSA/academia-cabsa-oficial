export const emptyLesson = { title: '', slug: '', module: '', lesson_type: 'CONTENT', minimum_reading_minutes: 5, summary: '', content: '' };

export const lessonTypes = {
  CONTENT: { label: 'Lección de contenido', short: 'Contenido', tone: 'blue', description: 'Explicación, lectura, video o material formativo.' },
  EXAM: { label: 'Evaluación / examen', short: 'Examen', tone: 'gold', description: 'Preguntas calificadas de opción múltiple o verdadero/falso.' },
  PRACTICE: { label: 'Actividad práctica', short: 'Práctica', tone: 'green', description: 'Ejercicio, consigna o actividad para aplicar lo aprendido.' },
  RESOURCE: { label: 'Material / recurso', short: 'Recurso', tone: 'neutral', description: 'Documento, enlace o material de consulta.' },
};

export const lessonType = (value) => lessonTypes[value] || lessonTypes.CONTENT;
export const slugify = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function lessonDraft(lesson, fallbackModule = '') {
  return lesson ? {
    title: lesson.title || '', slug: lesson.slug || '', module: lesson.module || '',
    lesson_type: lesson.lesson_type || 'CONTENT',
    minimum_reading_minutes: Math.max(1, Math.ceil(Number(lesson.minimum_reading_seconds || 300) / 60)),
    summary: lesson.summary || '', content: lesson.content || '',
  } : { ...emptyLesson, module: fallbackModule };
}

export function lessonPayload(form) {
  const payload = { ...form, minimum_reading_seconds: Math.max(60, Number(form.minimum_reading_minutes || 1) * 60) };
  delete payload.minimum_reading_minutes;
  return payload;
}
