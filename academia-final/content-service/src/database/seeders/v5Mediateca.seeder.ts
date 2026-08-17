import mysql, { type RowDataPacket } from 'mysql2/promise';
import database from '#config/database';
import env from '#config/env';
import CabsaCapsules from '#models/CabsaCapsules';

interface SourceCapsuleRow extends RowDataPacket {
  ID: number;
  post_title: string;
  post_name: string;
  post_excerpt: string;
  post_content: string;
  post_date: Date;
  attached_file: string | null;
  category: string | null;
}

const capsuleCategory = process.env.V5_CAPSULE_CATEGORY ?? 'capsulas-educativas';
const sourceDatabase = process.env.V5_DB_NAME ?? 'academia_cabsa';
const uploadsBaseUrl = (
  process.env.V5_UPLOADS_BASE_URL
  ?? 'https://academiacabsa.com/wp-content/uploads'
).replace(/\/$/, '');

const decodeEntities = (value: string): string => {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (entity, decimal, hexadecimal, name) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      return named[String(name).toLowerCase()] ?? entity;
    },
  );
};

const plainText = (html: string): string => decodeEntities(
  html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),
);

const truncateSummary = (value: string, limit = 160): string => {
  if (value.length <= limit) return value;

  const candidate = value.slice(0, limit + 1);
  const wordBoundary = candidate.lastIndexOf(' ');
  const end = wordBoundary > limit * 0.7 ? wordBoundary : limit;

  return `${candidate.slice(0, end).trim()}…`;
};

const imageFromContent = (html: string): string | null => {
  const match = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/iu);
  if (!match) return null;
  const source = decodeEntities(match[1]);
  if (source.startsWith('//')) return `https:${source}`;
  return /^https?:\/\//i.test(source) ? source : null;
};

const imageUrl = (row: SourceCapsuleRow): string | null => {
  if (row.attached_file) {
    return `${uploadsBaseUrl}/${row.attached_file.replace(/^\/+/, '')}`;
  }
  return imageFromContent(row.post_content ?? '');
};

const sourceQuery = `
  SELECT
    p.ID,
    p.post_title,
    p.post_name,
    p.post_excerpt,
    p.post_content,
    p.post_date,
    af.meta_value AS attached_file,
    COALESCE((
      SELECT MIN(topic.name)
      FROM ${sourceDatabase}.wp_term_relationships topic_rel
      INNER JOIN ${sourceDatabase}.wp_term_taxonomy topic_tax
        ON topic_tax.term_taxonomy_id = topic_rel.term_taxonomy_id
      INNER JOIN ${sourceDatabase}.wp_terms topic
        ON topic.term_id = topic_tax.term_id
      WHERE topic_rel.object_id = p.ID
        AND topic_tax.taxonomy = 'category'
        AND topic.slug <> ?
    ), 'Cápsulas Educativas') AS category
  FROM ${sourceDatabase}.wp_posts p
  LEFT JOIN ${sourceDatabase}.wp_postmeta thumbnail
    ON thumbnail.post_id = p.ID
    AND thumbnail.meta_key = '_thumbnail_id'
  LEFT JOIN ${sourceDatabase}.wp_postmeta af
    ON af.post_id = thumbnail.meta_value
    AND af.meta_key = '_wp_attached_file'
  WHERE p.post_type = 'post'
    AND p.post_status = 'publish'
    AND EXISTS (
      SELECT 1
      FROM ${sourceDatabase}.wp_term_relationships capsule_rel
      INNER JOIN ${sourceDatabase}.wp_term_taxonomy capsule_tax
        ON capsule_tax.term_taxonomy_id = capsule_rel.term_taxonomy_id
      INNER JOIN ${sourceDatabase}.wp_terms capsule_term
        ON capsule_term.term_id = capsule_tax.term_id
      WHERE capsule_rel.object_id = p.ID
        AND capsule_tax.taxonomy = 'category'
        AND capsule_term.slug = ?
    )
  ORDER BY p.post_date DESC
`;

const run = async () => {
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
    const [rows] = await source.query<SourceCapsuleRow[]>(
      sourceQuery,
      [capsuleCategory, capsuleCategory],
    );

    for (const row of rows) {
      const title = decodeEntities(row.post_title ?? '').trim();
      const excerpt = plainText(row.post_excerpt ?? '');
      const bodyText = plainText(row.post_content ?? '');
      const summary = truncateSummary(excerpt || bodyText || title);
      const publishedAt = new Date(row.post_date);

      await CabsaCapsules.upsert({
        id: Number(row.ID),
        slug: row.post_name.slice(0, 160),
        title: title.slice(0, 255),
        summary,
        body: row.post_content || null,
        category: decodeEntities(row.category || 'Cápsulas Educativas').slice(0, 120),
        image: imageUrl(row),
        external_url: null,
        is_featured: false,
        status: 'published',
        published_at: publishedAt,
        created_at: publishedAt,
        updated_at: new Date(),
      });
    }

    const total = await CabsaCapsules.count({ where: { status: 'published' } });
    process.stdout.write(JSON.stringify({
      imported: rows.length,
      publishedInTarget: total,
      sourceDatabase,
      targetDatabase: env.database.name,
    }));
  } finally {
    await source.end();
    await database.close();
  }
};

await run();
