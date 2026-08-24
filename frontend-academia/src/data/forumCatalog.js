/**
 * Presentacion de los foros: icono, titulo y descripcion por tema.
 *
 * Complementa a la API, que aporta los datos vivos (temas, respuestas, fechas)
 * pero no el aspecto. Se cruzan por `slug`, asi que un foro creado en la base
 * con un slug que no este aqui se vera sin icono ni descripcion.
 */
export const forumCatalog = [
  {
    icon: '👩‍🏫',
    title: 'Educación',
    slug: 'educacion',
    description: 'Foro para compartir estrategias, experiencias y recursos entre docentes, estudiantes y familias, enfocado en fortalecer el aprendizaje y la enseñanza.',
  },
  {
    icon: '❤️',
    title: 'Salud y Bienestar',
    slug: 'salud-y-bienestar',
    description: 'Espacio de diálogo sobre el cuidado físico y emocional, hábitos saludables, autocuidado y bienestar de la comunidad educativa.',
  },
  {
    icon: '📈',
    title: 'Finanzas',
    slug: 'finanzas',
    description: 'Comunidad para aprender y compartir recursos sobre educación financiera, ahorro y administración responsable del dinero.',
  },
  {
    icon: '📚',
    title: 'Nueva Escuela Mexicana (NEM)',
    slug: 'nueva-escuela-mexicana-nem',
    description: 'Intercambio de ideas, prácticas y materiales sobre inclusión, equidad, pensamiento crítico y formación integral.',
  },
  {
    icon: '🤖',
    title: 'Tecnología',
    slug: 'tecnologia',
    description: 'Espacio para explorar herramientas digitales aplicadas a la educación, el trabajo y la vida cotidiana.',
  },
  {
    icon: '🤝',
    title: 'Escuela para Padres',
    slug: 'escuela-para-padres',
    description: 'Acompañamiento para familias sobre aprendizaje, convivencia, bienestar y educación en casa.',
  },
];

/** Busca la presentacion de un foro por su slug. Devuelve `undefined` si no esta. */
export const forumReference = (slug) => forumCatalog.find((forum) => forum.slug === slug);
