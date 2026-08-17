import mysql, { type RowDataPacket } from 'mysql2/promise';
import database from '#config/database';
import env from '#config/env';
import CabsaForums from '#models/CabsaForums';
import CabsaForumTopics from '#models/CabsaForumTopics';
import CabsaForumReplies from '#models/CabsaForumReplies';

interface SourceForum extends RowDataPacket {
  id: number;
  title: string;
  slug: string;
  description: string;
  created_at: Date;
  topics_count: number;
}

interface SourceTopic extends RowDataPacket {
  id: number;
  forum_id: number;
  author_id: number;
  author_name: string | null;
  slug: string;
  title: string;
  content: string;
  created_at: Date;
}

interface SourceReply extends RowDataPacket {
  id: number;
  topic_id: number;
  forum_id: number;
  author_id: number;
  author_name: string | null;
  content: string;
  created_at: Date;
}

const sourceDatabase = process.env.V5_DB_NAME ?? 'academia_cabsa';
if (!/^[a-z0-9_]+$/i.test(sourceDatabase)) {
  throw new Error('V5_DB_NAME contiene caracteres no permitidos');
}

const catalog: Record<string, { icon: string; description: string }> = {
  'salud-y-bienestar': {
    icon: '❤️',
    description: 'Espacio de diálogo sobre el cuidado físico y emocional, hábitos saludables y herramientas de autocuidado.',
  },
  educacion: {
    icon: '👩‍🏫',
    description: 'Foro para compartir estrategias, experiencias y recursos entre docentes, estudiantes y familias.',
  },
  finanzas: {
    icon: '📈',
    description: 'Comunidad para aprender y compartir recursos sobre educación financiera y administración del dinero.',
  },
  'nueva-escuela-mexicana-nem': {
    icon: '📚',
    description: 'Intercambio de prácticas y materiales sobre inclusión, equidad y formación integral en la NEM.',
  },
  tecnologia: {
    icon: '🤖',
    description: 'Espacio para explorar herramientas digitales aplicadas a la educación, el trabajo y la vida cotidiana.',
  },
  'escuela-para-padres': {
    icon: '🤝',
    description: 'Acompañamiento para familias sobre aprendizaje, convivencia, bienestar y educación en casa.',
  },
};

const plainText = (html: string): string => html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#(\d+);/g, (_entity, code) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, ' ')
  .trim();

const createTables = async (): Promise<void> => {
  await database.query(`
    CREATE TABLE IF NOT EXISTS academia_foros (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug VARCHAR(160) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      icon VARCHAR(16) NULL,
      topics_count INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_at DATETIME NULL,
      updated_at DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_cabsa_forums_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS academia_foro_temas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      forum_id BIGINT UNSIGNED NOT NULL,
      author_id VARCHAR(64) NULL,
      author_name VARCHAR(255) NULL,
      slug VARCHAR(190) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_cabsa_forum_topics_slug (slug),
      KEY idx_cabsa_forum_topics_forum (forum_id),
      KEY idx_cabsa_forum_topics_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS academia_foro_respuestas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      topic_id BIGINT UNSIGNED NOT NULL,
      forum_id BIGINT UNSIGNED NOT NULL,
      author_id VARCHAR(64) NULL,
      author_name VARCHAR(255) NULL,
      content LONGTEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY idx_cabsa_forum_replies_topic (topic_id),
      KEY idx_cabsa_forum_replies_forum (forum_id),
      KEY idx_cabsa_forum_replies_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const forumsQuery = `
  SELECT
    f.ID AS id,
    f.post_title AS title,
    f.post_name AS slug,
    f.post_content AS description,
    f.post_date AS created_at,
    (
      SELECT COUNT(*)
      FROM wp_posts topic
      INNER JOIN wp_postmeta forum_meta
        ON forum_meta.post_id = topic.ID
        AND forum_meta.meta_key = '_bbp_forum_id'
        AND CAST(forum_meta.meta_value AS UNSIGNED) = f.ID
      WHERE topic.post_type = 'topic'
        AND topic.post_status = 'publish'
    ) AS topics_count
  FROM wp_posts f
  WHERE f.post_type = 'forum'
    AND f.post_status = 'publish'
  ORDER BY f.menu_order, f.ID
`;

const topicsQuery = `
  SELECT
    topic.ID AS id,
    CAST(forum_meta.meta_value AS UNSIGNED) AS forum_id,
    topic.post_author AS author_id,
    users.display_name AS author_name,
    topic.post_name AS slug,
    topic.post_title AS title,
    topic.post_content AS content,
    topic.post_date AS created_at
  FROM wp_posts topic
  INNER JOIN wp_postmeta forum_meta
    ON forum_meta.post_id = topic.ID
    AND forum_meta.meta_key = '_bbp_forum_id'
  LEFT JOIN wp_users users ON users.ID = topic.post_author
  WHERE topic.post_type = 'topic'
    AND topic.post_status = 'publish'
  ORDER BY topic.post_date DESC
`;

const repliesQuery = `
  SELECT
    reply.ID AS id,
    CAST(topic_meta.meta_value AS UNSIGNED) AS topic_id,
    CAST(forum_meta.meta_value AS UNSIGNED) AS forum_id,
    reply.post_author AS author_id,
    users.display_name AS author_name,
    reply.post_content AS content,
    reply.post_date AS created_at
  FROM wp_posts reply
  INNER JOIN wp_postmeta topic_meta
    ON topic_meta.post_id = reply.ID
    AND topic_meta.meta_key = '_bbp_topic_id'
  LEFT JOIN wp_postmeta forum_meta
    ON forum_meta.post_id = reply.ID
    AND forum_meta.meta_key = '_bbp_forum_id'
  LEFT JOIN wp_users users ON users.ID = reply.post_author
  WHERE reply.post_type = 'reply'
    AND reply.post_status = 'publish'
  ORDER BY reply.post_date
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
    await createTables();

    const [forums] = await source.query<SourceForum[]>(forumsQuery);
    const [topics] = await source.query<SourceTopic[]>(topicsQuery);
    const [replies] = await source.query<SourceReply[]>(repliesQuery);
    const now = new Date();

    for (const forum of forums) {
      const reference = catalog[forum.slug];
      await CabsaForums.upsert({
        id: Number(forum.id),
        slug: forum.slug.slice(0, 160),
        title: plainText(forum.title).slice(0, 255),
        description: plainText(forum.description)
          || reference?.description
          || 'Espacio de diálogo y colaboración de la comunidad CABSA.',
        icon: reference?.icon || '💬',
        topics_count: Number(forum.topics_count),
        status: 'published',
        created_at: new Date(forum.created_at),
        updated_at: now,
      });
    }

    for (const topic of topics) {
      await CabsaForumTopics.upsert({
        id: Number(topic.id),
        forum_id: Number(topic.forum_id),
        author_id: topic.author_id ? String(topic.author_id) : null,
        author_name: topic.author_name || 'Comunidad CABSA',
        slug: topic.slug.slice(0, 190),
        title: plainText(topic.title).slice(0, 255),
        content: topic.content || '',
        status: 'published',
        created_at: new Date(topic.created_at),
        updated_at: now,
      });
    }

    for (const reply of replies) {
      await CabsaForumReplies.upsert({
        id: Number(reply.id),
        topic_id: Number(reply.topic_id),
        forum_id: Number(reply.forum_id),
        author_id: reply.author_id ? String(reply.author_id) : null,
        author_name: reply.author_name || 'Comunidad CABSA',
        content: reply.content || '',
        status: 'published',
        created_at: new Date(reply.created_at),
        updated_at: now,
      });
    }

    process.stdout.write(JSON.stringify({
      forumsImported: forums.length,
      topicsImported: topics.length,
      repliesImported: replies.length,
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
