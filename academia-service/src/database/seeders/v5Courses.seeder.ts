import mysql, { type RowDataPacket } from 'mysql2/promise';
import database from '#config/database';
import env from '#config/env';
import CabsaCourses from '#models/CabsaCourses';
import CabsaCourseLessons from '#models/CabsaCourseLessons';

interface SourceCourse extends RowDataPacket {
  ID: number;
  post_title: string;
  post_name: string;
  post_excerpt: string;
  post_content: string;
  post_date: Date;
  attached_file: string | null;
  category: string | null;
}

interface SourceLesson extends RowDataPacket {
  ID: number;
  post_title: string;
  post_name: string;
  post_excerpt: string;
  post_content: string;
  menu_order: number;
  custom_order: string | null;
  module: string | null;
  module_term_id: number | null;
}

const sourceDatabase = process.env.V5_DB_NAME ?? 'academia_cabsa';
const uploadsBaseUrl = (
  process.env.V5_UPLOADS_BASE_URL
  ?? 'https://academiacabsa.com/wp-content/uploads'
).replace(/\/$/, '');

if (!/^[a-z0-9_]+$/i.test(sourceDatabase)) {
  throw new Error('V5_DB_NAME contiene caracteres no permitidos');
}

const plainText = (html: string): string => html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\[[^\]]+\]/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#039;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_entity, code) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, ' ')
  .trim();

const truncate = (value: string, limit: number): string => {
  if (value.length <= limit) return value;
  const candidate = value.slice(0, limit + 1);
  const boundary = candidate.lastIndexOf(' ');
  return `${candidate.slice(0, boundary > limit * 0.7 ? boundary : limit).trim()}…`;
};

const normalize = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const moduleRanks: Record<string, Record<string, number>> = {
  matematicas: {
    introduccion: 10,
    'teorias del aprendizaje': 20,
    'metodos de ensenanza': 30,
    'evaluacion y retroalimentacion': 40,
    'planeacion de la ensenanza': 50,
    'implementacion de las tics': 60,
    'cierre e integracion': 1000,
  },
  'dinero-y-ahorro': {
    'descripcion del curso': 10,
    'modulo 1': 20,
    'modulo 2': 30,
    'modulo 3': 40,
    'modulo 4': 50,
    'modulo de cierre': 1000,
  },
  'pensamiento-critico': {
    'modulo 1': 10,
    'modulo 2': 20,
    'modulo 3': 30,
    'modulo 4': 40,
    'modulo de cierre': 1000,
  },
  'docentes-ia': {
    'modulo 1': 10,
    'modulo 2': 20,
    'modulo 3': 30,
    'modulo 4': 40,
    'modulo de cierre': 1000,
  },
  'ia-finanzas': {
    'modulo 1': 10,
    'modulo 2': 20,
    'modulo 3': 30,
    'modulo 4': 40,
    'modulo de cierre': 1000,
  },
  'ia-basico': {
    introduccion: 10,
    'modulo 1': 20,
    'modulo 2': 30,
    'modulo 3': 40,
    'modulo 4': 50,
    'modulo 5': 60,
    'modulo de cierre': 1000,
  },
};

const moduleOrder = (module: string | null, courseSlug: string): number => {
  const normalized = normalize(module ?? '');
  const configured = moduleRanks[courseSlug] ?? {};
  const match = Object.entries(configured).find(([prefix]) => normalized.startsWith(prefix));
  if (match) return match[1];
  const numbered = normalized.match(/modulo\s+(\d+)/);
  if (numbered) return 100 + (Number(numbered[1]) * 10);
  if (normalized.includes('cierre') || normalized.includes('examen')) return 1000;
  return 500;
};

const lessonOrder = (lesson: SourceLesson): number => {
  if (lesson.custom_order !== null && Number.isFinite(Number(lesson.custom_order))) {
    return Number(lesson.custom_order);
  }
  const title = normalize(lesson.post_title);
  if (title.includes('examen final')) return 10000;
  if (title.includes('introduccion al curso') || title.includes('fundamentacion del curso')) return 1;
  if (title.includes('descripcion del curso') || title.includes('manual del participante')) return 2;
  if (title.includes('calendario') || title.includes('glosario')) return 3;
  const numbered = title.match(/leccion\s+(\d+)/);
  return numbered ? Number(numbered[1]) : Number(lesson.menu_order || 0);
};

const orderLessons = (lessons: SourceLesson[], courseSlug: string): SourceLesson[] => (
  [...lessons].sort((left, right) => (
    moduleOrder(left.module, courseSlug) - moduleOrder(right.module, courseSlug)
    || Number(left.module_term_id || 0) - Number(right.module_term_id || 0)
    || normalize(left.module ?? '').localeCompare(normalize(right.module ?? ''), 'es')
    || lessonOrder(left) - lessonOrder(right)
    || Number(left.ID) - Number(right.ID)
  ))
);

const normalizeContentUrls = (html: string): string => html
  .replace(
    /(["'])\/wp-content\/uploads\//gi,
    `$1${uploadsBaseUrl}/`,
  );

const ensureLessonColumns = async (): Promise<void> => {
  const columns = await database.getQueryInterface().describeTable('academia_lecciones');
  const additions = [
    ['slug', 'VARCHAR(160) NULL AFTER `number`'],
    ['module', 'VARCHAR(255) NULL AFTER `title`'],
    ['content', 'LONGTEXT NULL AFTER `summary`'],
  ] as const;

  for (const [name, definition] of additions) {
    if (!columns[name]) {
      await database.query(
        `ALTER TABLE \`academia_lecciones\` ADD COLUMN \`${name}\` ${definition}`,
      );
    }
  }
};

const ensureCourseColumns = async (): Promise<void> => {
  const columns = await database.getQueryInterface().describeTable('academia_cursos');
  if (!columns.lessons_count) {
    await database.query(
      'ALTER TABLE `academia_cursos` ADD COLUMN `lessons_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `category`',
    );
  }
};

const courseQuery = `
  SELECT
    c.ID,
    c.post_title,
    c.post_name,
    c.post_excerpt,
    c.post_content,
    c.post_date,
    af.meta_value AS attached_file,
    (
      SELECT tc.name
      FROM wp_term_relationships trc
      INNER JOIN wp_term_taxonomy ttc
        ON ttc.term_taxonomy_id = trc.term_taxonomy_id
      INNER JOIN wp_terms tc
        ON tc.term_id = ttc.term_id
      WHERE trc.object_id = c.ID
        AND ttc.taxonomy IN ('course-category', 'category')
      ORDER BY tc.name
      LIMIT 1
    ) AS category
  FROM wp_posts c
  LEFT JOIN wp_postmeta thumbnail
    ON thumbnail.post_id = c.ID
    AND thumbnail.meta_key = '_thumbnail_id'
  LEFT JOIN wp_postmeta af
    ON af.post_id = thumbnail.meta_value
    AND af.meta_key = '_wp_attached_file'
  WHERE c.post_type = 'course'
    AND c.post_status = 'publish'
  ORDER BY c.post_date DESC
`;

const lessonQuery = `
  SELECT
    l.ID,
    l.post_title,
    l.post_name,
    l.post_excerpt,
    l.post_content,
    l.menu_order,
    lesson_order.meta_value AS custom_order,
    (
      SELECT module_term.name
      FROM wp_term_relationships module_relationship
      INNER JOIN wp_term_taxonomy module_taxonomy
        ON module_taxonomy.term_taxonomy_id = module_relationship.term_taxonomy_id
      INNER JOIN wp_terms module_term
        ON module_term.term_id = module_taxonomy.term_id
      WHERE module_relationship.object_id = l.ID
        AND module_taxonomy.taxonomy = 'module'
      ORDER BY module_term.term_id
      LIMIT 1
    ) AS module,
    (
      SELECT module_taxonomy.term_id
      FROM wp_term_relationships module_relationship
      INNER JOIN wp_term_taxonomy module_taxonomy
        ON module_taxonomy.term_taxonomy_id = module_relationship.term_taxonomy_id
      WHERE module_relationship.object_id = l.ID
        AND module_taxonomy.taxonomy = 'module'
      ORDER BY module_taxonomy.term_id
      LIMIT 1
    ) AS module_term_id
  FROM wp_posts l
  INNER JOIN wp_postmeta lesson_course
    ON lesson_course.post_id = l.ID
    AND lesson_course.meta_key = '_lesson_course'
  LEFT JOIN wp_postmeta lesson_order
    ON lesson_order.post_id = l.ID
    AND lesson_order.meta_key = CONCAT('_order_', ?)
  WHERE lesson_course.meta_value = ?
    AND l.post_type = 'lesson'
    AND l.post_status = 'publish'
`;

const run = async (): Promise<void> => {
  const source = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: sourceDatabase,
    charset: 'utf8mb4',
  });

  try {
    await database.authenticate();
    await ensureCourseColumns();
    await ensureLessonColumns();

    const [courses] = await source.query<SourceCourse[]>(courseQuery);
    let lessonsImported = 0;

    for (const row of courses) {
      const description = plainText(row.post_excerpt || row.post_content || row.post_title);
      const publishedAt = new Date(row.post_date);

      await CabsaCourses.upsert({
        id: Number(row.ID),
        slug: row.post_name.slice(0, 160),
        title: plainText(row.post_title).slice(0, 255),
        summary: truncate(description, 180),
        description,
        image: row.attached_file
          ? `${uploadsBaseUrl}/${row.attached_file.replace(/^\/+/, '')}`
          : null,
        category: row.category?.slice(0, 120) || null,
        lessons_count: 0,
        status: 'published',
        published_at: publishedAt,
        created_at: publishedAt,
        updated_at: new Date(),
      });

      const [sourceLessons] = await source.query<SourceLesson[]>(
        lessonQuery,
        [String(row.ID), String(row.ID)],
      );
      const lessons = orderLessons(sourceLessons, row.post_name);
      await CabsaCourses.update(
        { lessons_count: lessons.length },
        { where: { id: Number(row.ID) } },
      );

      for (const [index, lesson] of lessons.entries()) {
        const summary = plainText(lesson.post_excerpt || lesson.post_content);
        await CabsaCourseLessons.upsert({
          id: Number(lesson.ID),
          course_id: Number(row.ID),
          number: index + 1,
          slug: lesson.post_name.slice(0, 160),
          title: plainText(lesson.post_title).slice(0, 255),
          module: lesson.module?.slice(0, 255) || 'Contenido del curso',
          summary: summary ? truncate(summary, 220) : null,
          content: normalizeContentUrls(lesson.post_content || '') || null,
          created_at: publishedAt,
          updated_at: new Date(),
        });
      }

      lessonsImported += lessons.length;
    }

    process.stdout.write(JSON.stringify({
      coursesImported: courses.length,
      lessonsImported,
      sourceDatabase,
      targetDatabase: env.database.name,
    }));
  } finally {
    await source.end();
    await database.close();
  }
};

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
