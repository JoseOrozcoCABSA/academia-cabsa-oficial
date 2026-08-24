/**
 * Catalogo de reserva que se muestra cuando la API no responde.
 *
 * No es la fuente de verdad: son datos fijos para que las pantallas publicas no
 * queden en blanco si el backend esta caido. Cuando se usan, `useRemoteList`
 * marca `usingReference` y la pantalla lo advierte.
 *
 * Al estar escritos a mano se desactualizan: el numero de lecciones y el
 * progreso pueden no coincidir con la base de datos.
 */
export const courses = [
  { id: 'bootcamp-docente-2', title: 'Bootcamp Docente', lessons: 0, progress: 0, summary: 'Experiencia formativa para acompañar a las escuelas en la integración práctica de Academia CABSA.', image: '/assets/images/bootcamp.png', category: 'Formación docente' },
  { id: 'ia-basico', title: 'Curso Básico de IA', lessons: 32, progress: 0, summary: 'Una visión sólida y práctica de la Inteligencia Artificial, con herramientas para comenzar a utilizarla.', image: '/assets/images/ia-basica.jpg', category: 'Tecnología' },
  { id: 'ia-finanzas', title: 'Inteligencia Artificial para Gerentes Financieros', lessons: 15, progress: 0, summary: 'Herramientas, estrategias y conocimientos sobre el uso de la IA aplicada a las finanzas.', image: '/assets/images/ia-finanzas.png', category: 'Tecnología' },
  { id: 'docentes-ia', title: 'Docentes en la Era de la IA: Innovando para el Futuro Educativo', lessons: 9, progress: 0, summary: 'Recursos y estrategias para integrar la Inteligencia Artificial en la práctica docente.', image: '/assets/images/docentes-ia.png', category: 'Tecnología' },
  { id: 'pensamiento-critico', title: 'Pensamiento Crítico en un Mundo de Desafíos', lessons: 9, progress: 0, summary: 'Herramientas para identificar influencias externas y desarrollar decisiones más conscientes.', image: '/assets/images/pensamiento.jpg', category: 'Pensamiento crítico' },
  { id: 'dinero-y-ahorro', title: 'Dinero y Ahorro para Niños y Jóvenes', lessons: 7, progress: 0, summary: 'Conceptos básicos de dinero, ahorro e inversión para tomar mejores decisiones financieras.', image: '/assets/images/dinero.png', category: 'Desarrollo integral' },
  { id: 'matematicas', title: 'Enseñanza Efectiva de las Matemáticas', lessons: 41, progress: 0, summary: 'Teorías, metodologías, estrategias y herramientas digitales para fortalecer la enseñanza de las matemáticas.', image: 'https://academiacabsa.com/wp-content/uploads/2025/07/young-male-teacher-wearing-glasses-explaining-lesson-happy-positive-smiling-standing-near-blackboard-with-mathematical-formulas-classroomfx-1-600x400-1.jpg', category: 'Matemáticas' },
];

/** Capsulas de reserva para la mediateca. Misma advertencia que {@link courses}. */
export const capsules = [
  { id: 'igualdad-equidad', title: 'Igualdad y equidad', category: 'Nueva Escuela Mexicana', summary: 'No todos necesitamos lo mismo para llegar.', image: '/assets/images/igualdad.png' },
  { id: 'normas', title: 'La importancia de las normas', category: 'Convivencia', summary: 'Convivir, organizarnos y construir espacios seguros.', image: '/assets/images/normas.png' },
  { id: 'redes', title: 'Seguridad en redes sociales', category: 'Tecnología', summary: 'Protege tu información y comunícate de forma segura.', image: '/assets/images/redes.png' },
  { id: 'emociones', title: 'Cuando las emociones toman el volante', category: 'Salud y bienestar', summary: 'Reconoce lo que sientes y responde con mayor calma.', image: '/assets/images/emociones.png' },
  { id: 'bullying', title: 'Alto al bullying', category: 'Convivencia', summary: 'Ser valiente también es cuidar y pedir ayuda.', image: '/assets/images/bullying.png' },
  { id: 'diversidad', title: 'Diversidad: diferentes y valiosos', category: 'Nueva Escuela Mexicana', summary: 'Construye comunidades donde todas las personas participan.', image: '/assets/images/diversidad.png' },
];

/**
 * Asistentes y tutores de IA que se muestran en la portada.
 *
 * A diferencia de los cursos, estos **no** vienen de la API: la portada los lee
 * siempre de aqui. El campo `kind` distingue asistente de tutor y es lo que usa
 * la portada para repartirlos en dos secciones.
 */
export const assistants = [
  { id: 'preescolar', kind: 'Asistente IA', title: 'Asistentes Virtuales de Preescolar', audience: 'Docentes', description: 'Planeación, evaluación formativa y estrategias didácticas para preescolar.', image: '/assets/images/assistant-preschool.png' },
  { id: 'primaria', kind: 'Asistente IA', title: 'Asistentes Virtuales de Primaria', audience: 'Docentes', description: 'Planeación, evaluación formativa y estrategias didácticas para primaria.', image: '/assets/images/assistant-primary.png' },
  { id: 'secundaria', kind: 'Asistente IA', title: 'Asistentes Virtuales de Secundaria', audience: 'Docentes', description: 'Planeación, evaluación formativa y estrategias didácticas para secundaria.', image: '/assets/images/assistant-secondary.png' },
  { id: 'tutor-preescolar', kind: 'Tutor virtual', title: 'Tutores Virtuales de Preescolar', audience: 'Estudiantes y familias', description: 'Acompañamiento inteligente para estudiantes y familias de preescolar.', image: '/assets/images/tutor-preschool.png' },
  { id: 'tutor-primaria', kind: 'Tutor virtual', title: 'Tutores Virtuales de Primaria', audience: 'Estudiantes y familias', description: 'Acompañamiento inteligente para estudiantes y familias de primaria.', image: '/assets/images/tutor-primary.png' },
  { id: 'tutor-secundaria', kind: 'Tutor virtual', title: 'Tutores Virtuales de Secundaria', audience: 'Estudiantes y familias', description: 'Acompañamiento inteligente para estudiantes y familias de secundaria.', image: '/assets/images/tutor-secondary.png' },
];
