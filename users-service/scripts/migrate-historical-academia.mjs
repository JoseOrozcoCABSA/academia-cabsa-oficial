import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const sourceSchema = process.env.MIGRATION_SOURCE_DB || 'academia_cabsa';
const targetSchema = process.env.MIGRATION_TARGET_DB || 'academia-soa';
const apply = process.argv.includes('--apply');
const password = process.env.MIGRATION_DB_PASSWORD;

if (!password) {
  throw new Error('MIGRATION_DB_PASSWORD es obligatorio');
}

const connection = await mysql.createConnection({
  host: process.env.MIGRATION_DB_HOST || '127.0.0.1',
  port: Number(process.env.MIGRATION_DB_PORT || 3306),
  user: process.env.MIGRATION_DB_USER || 'root',
  password,
  multipleStatements: false,
});

const identifier = (value) => `\`${String(value).replaceAll('`', '``')}\``;
const tableName = (schema, table) => `${identifier(schema)}.${identifier(table)}`;

const directMappings = [
  ['usuarios_oficiales', 'usuarios_oficiales'],
  ['grupos_cabsa', 'usuarios_grupos'],
  ['usuarios_grupos_cabsa', 'usuarios_miembros_grupos'],
  ['cabsa_pendientes', 'usuarios_pendientes'],
  ['cabsa_fomaqro_registros', 'usuarios_fomaqro_registros'],
  ['cabsa_user_becas', 'usuarios_becas'],
  ['wp_cabsa_beca_code_email', 'usuarios_codigos_beca_email'],
  ['wp_pmpro_membership_levels', 'usuarios_niveles_membresia'],
  ['wp_pmpro_memberships_users', 'usuarios_membresias'],
  ['cabsa_asistentes_tutores', 'ia_asistentes_tutores'],
  ['wp_cabsa_ai_assistant_events', 'analitica_eventos_asistentes_ia'],
  ['wp_cabsa_capsula_avances', 'analitica_avances_capsulas'],
  ['wp_cabsa_dias_activos', 'analitica_dias_activos'],
  ['wp_cabsa_rachas', 'analitica_rachas'],
  ['wp_cabsa_soporte_tickets', 'notificaciones_soporte_tickets'],
  ['wp_cabsa_soporte_adjuntos', 'notificaciones_soporte_adjuntos'],
];

const generatedTargetTables = [
  'usuarios_cuentas',
  'usuarios_asignaciones_roles',
  'analitica_progreso_capsulas',
  'analitica_actividad_aprendizaje',
  'academia_inscripciones',
  'academia_progreso_lecciones',
];

const affectedTargetTables = [
  ...new Set([
    ...directMappings.map(([, target]) => target),
    ...generatedTargetTables,
  ]),
];

const rows = async (sql, values = []) => {
  const [result] = await connection.query(sql, values);
  return result;
};

const scalarCount = async (schema, table) => {
  const [result] = await rows(
    `SELECT COUNT(*) AS total FROM ${tableName(schema, table)}`,
  );
  return Number(result.total);
};

const tableColumns = async (schema, table) => rows(
  `SELECT COLUMN_NAME, COLUMN_KEY
   FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
   ORDER BY ORDINAL_POSITION`,
  [schema, table],
);

const upsertRows = async (schema, table, columns, primaryColumns, values) => {
  if (!values.length) return;
  const updateColumns = columns.filter((column) => !primaryColumns.has(column));
  const columnSql = columns.map(identifier).join(', ');
  const updateSql = updateColumns.length
    ? ` ON DUPLICATE KEY UPDATE ${updateColumns
      .map((column) => `${identifier(column)} = VALUES(${identifier(column)})`)
      .join(', ')}`
    : '';

  for (let offset = 0; offset < values.length; offset += 400) {
    const chunk = values.slice(offset, offset + 400);
    const placeholders = chunk
      .map(() => `(${columns.map(() => '?').join(', ')})`)
      .join(', ');
    const flattened = chunk.flatMap((record) => columns.map(
      (column) => record[column] ?? null,
    ));
    await connection.query(
      `INSERT INTO ${tableName(schema, table)} (${columnSql})
       VALUES ${placeholders}${updateSql}`,
      flattened,
    );
  }
};

const copyCompatibleTable = async (sourceTable, targetTable) => {
  const [sourceColumns, targetColumns] = await Promise.all([
    tableColumns(sourceSchema, sourceTable),
    tableColumns(targetSchema, targetTable),
  ]);
  const sourceNames = new Set(sourceColumns.map((column) => column.COLUMN_NAME));
  const columns = targetColumns
    .map((column) => column.COLUMN_NAME)
    .filter((column) => sourceNames.has(column));
  const primaryColumns = new Set(
    targetColumns
      .filter((column) => column.COLUMN_KEY === 'PRI')
      .map((column) => column.COLUMN_NAME),
  );
  const sourceRows = await rows(
    `SELECT ${columns.map(identifier).join(', ')}
     FROM ${tableName(sourceSchema, sourceTable)}`,
  );
  await upsertRows(targetSchema, targetTable, columns, primaryColumns, sourceRows);
  return sourceRows.length;
};

const createBackup = async () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/\D/g, '')
    .slice(0, 14);
  const backupBase = targetSchema
    .replaceAll(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 35);
  const backupSchema = `${backupBase}_backup_${timestamp}`;
  await connection.query(
    `CREATE DATABASE ${identifier(backupSchema)}
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  for (const table of affectedTargetTables) {
    await connection.query(
      `CREATE TABLE ${tableName(backupSchema, table)}
       LIKE ${tableName(targetSchema, table)}`,
    );
    await connection.query(
      `INSERT INTO ${tableName(backupSchema, table)}
       SELECT * FROM ${tableName(targetSchema, table)}`,
    );
  }
  return backupSchema;
};

const migrateAccounts = async () => {
  const sourceUsers = await rows(
    `SELECT
       u.ID AS wp_user_id,
       u.user_login,
       u.user_pass,
       u.user_email,
       u.user_registered,
       u.user_status,
       u.display_name,
       o.id AS official_user_id,
       o.nombre,
       o.apellidos,
       o.estado_cuenta,
       o.ultimo_login,
       o.actualizado_en
     FROM ${tableName(sourceSchema, 'wp_users')} AS u
     INNER JOIN ${tableName(sourceSchema, 'usuarios_oficiales')} AS o
       ON o.wp_user_id = u.ID
     ORDER BY u.ID`,
  );
  const currentAccounts = await rows(
    `SELECT id, legacy_wp_user_id, email, username
     FROM ${tableName(targetSchema, 'usuarios_cuentas')}`,
  );
  const capabilities = await rows(
    `SELECT user_id, meta_value
     FROM ${tableName(sourceSchema, 'wp_usermeta')}
     WHERE meta_key = 'wp_capabilities'`,
  );
  const capabilityByUser = new Map(
    capabilities.map((record) => [Number(record.user_id), String(record.meta_value || '')]),
  );
  const roles = await rows(
    `SELECT id, code FROM ${tableName(targetSchema, 'usuarios_roles')}
     WHERE code IN ('ADMIN', 'STUDENT')`,
  );
  const roleByCode = new Map(roles.map((role) => [role.code, role.id]));
  if (!roleByCode.has('ADMIN') || !roleByCode.has('STUDENT')) {
    throw new Error('Faltan los roles ADMIN o STUDENT en la base destino');
  }

  const accountByLegacyId = new Map();
  const accountByEmail = new Map();
  const accountByUsername = new Map();
  for (const account of currentAccounts) {
    if (account.legacy_wp_user_id) {
      accountByLegacyId.set(Number(account.legacy_wp_user_id), account);
    }
    accountByEmail.set(String(account.email).trim().toLowerCase(), account);
    accountByUsername.set(String(account.username).trim().toLowerCase(), account);
  }

  const seenSourceEmails = new Set();
  const seenSourceUsernames = new Set();
  let inserted = 0;
  let linked = 0;
  let aliases = 0;
  let localRolesAssigned = 0;
  const accountIdByWpUser = new Map();

  for (const sourceUser of sourceUsers) {
    const wpUserId = Number(sourceUser.wp_user_id);
    const rawEmail = String(sourceUser.user_email).trim().toLowerCase();
    const rawUsername = String(sourceUser.user_login).trim();
    const emailKey = rawEmail.toLowerCase();
    const usernameKey = rawUsername.toLowerCase();
    const duplicateEmail = seenSourceEmails.has(emailKey);
    const duplicateUsername = seenSourceUsernames.has(usernameKey);
    seenSourceEmails.add(emailKey);
    seenSourceUsernames.add(usernameKey);

    const email = duplicateEmail
      ? `legacy+wp${wpUserId}@invalid.academia.local`
      : rawEmail;
    const username = duplicateUsername
      ? `${rawUsername.slice(0, 85)}-wp${wpUserId}`
      : rawUsername;
    if (duplicateEmail || duplicateUsername) aliases += 1;

    let account = accountByLegacyId.get(wpUserId);
    if (!account && !duplicateEmail) account = accountByEmail.get(emailKey);
    if (!account && !duplicateUsername) account = accountByUsername.get(usernameKey);

    if (account) {
      await connection.query(
        `UPDATE ${tableName(targetSchema, 'usuarios_cuentas')}
         SET legacy_official_user_id = COALESCE(legacy_official_user_id, ?),
             legacy_wp_user_id = COALESCE(legacy_wp_user_id, ?),
             updated_at = GREATEST(updated_at, ?)
         WHERE id = ?`,
        [
          sourceUser.official_user_id,
          wpUserId,
          sourceUser.actualizado_en || sourceUser.user_registered,
          account.id,
        ],
      );
      linked += 1;
    } else {
      account = {
        id: randomUUID(),
        email,
        username,
        legacy_wp_user_id: wpUserId,
      };
      await connection.query(
        `INSERT INTO ${tableName(targetSchema, 'usuarios_cuentas')} (
           id, legacy_official_user_id, legacy_wp_user_id,
           email, username, password_hash,
           first_name, last_name, display_name, phone,
           status, email_verified_at, last_login_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
        [
          account.id,
          sourceUser.official_user_id,
          wpUserId,
          email,
          username,
          sourceUser.user_pass,
          sourceUser.nombre || null,
          sourceUser.apellidos || null,
          sourceUser.display_name || username,
          sourceUser.estado_cuenta === 'activo' && Number(sourceUser.user_status) === 0
            ? 'ACTIVE'
            : 'DISABLED',
          sourceUser.estado_cuenta === 'activo' ? sourceUser.user_registered : null,
          sourceUser.ultimo_login || null,
          sourceUser.user_registered,
          sourceUser.actualizado_en || sourceUser.user_registered,
        ],
      );
      accountByEmail.set(email.toLowerCase(), account);
      accountByUsername.set(username.toLowerCase(), account);
      inserted += 1;
    }
    accountByLegacyId.set(wpUserId, account);
    accountIdByWpUser.set(wpUserId, account.id);

    const wpCapabilities = capabilityByUser.get(wpUserId) || '';
    const roleCode = /"(?:administrator|editor|author)"/i.test(wpCapabilities)
      ? 'ADMIN'
      : 'STUDENT';
    await connection.query(
      `INSERT IGNORE INTO ${tableName(targetSchema, 'usuarios_asignaciones_roles')} (
         user_id, role_id, assigned_by, created_at, updated_at
       ) VALUES (?, ?, NULL, ?, ?)`,
      [
        account.id,
        roleByCode.get(roleCode),
        sourceUser.user_registered,
        sourceUser.actualizado_en || sourceUser.user_registered,
      ],
    );
  }

  const unassignedLocalAccounts = await rows(
    `SELECT a.id, a.username, a.email, a.created_at, a.updated_at
     FROM ${tableName(targetSchema, 'usuarios_cuentas')} AS a
     LEFT JOIN ${tableName(targetSchema, 'usuarios_asignaciones_roles')} AS ur
       ON ur.user_id = a.id
     WHERE a.legacy_wp_user_id IS NULL
     GROUP BY a.id, a.username, a.email, a.created_at, a.updated_at
     HAVING COUNT(ur.role_id) = 0`,
  );
  for (const account of unassignedLocalAccounts) {
    const roleCode = /^admin(?:[._-]|$)/i.test(String(account.username))
      || /^admin(?:[+@._-]|$)/i.test(String(account.email))
      ? 'ADMIN'
      : 'STUDENT';
    await connection.query(
      `INSERT IGNORE INTO ${tableName(targetSchema, 'usuarios_asignaciones_roles')} (
         user_id, role_id, assigned_by, created_at, updated_at
       ) VALUES (?, ?, NULL, ?, ?)`,
      [
        account.id,
        roleByCode.get(roleCode),
        account.created_at,
        account.updated_at,
      ],
    );
    localRolesAssigned += 1;
  }

  return {
    source: sourceUsers.length,
    inserted,
    linked,
    aliases,
    localRolesAssigned,
    accountIdByWpUser,
  };
};

const semaphoreStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['verde', 'green', 'understood', 'comprendi_bien'].includes(normalized)) {
    return 'GREEN';
  }
  if (['amarillo', 'yellow', 'reinforce', 'necesito_reforzar'].includes(normalized)) {
    return 'YELLOW';
  }
  if (['rojo', 'red', 'support', 'necesito_apoyo'].includes(normalized)) {
    return 'RED';
  }
  return null;
};

const migrateCapsuleProgress = async (accountIdByWpUser) => {
  const legacyRows = await rows(
    `SELECT a.*
     FROM ${tableName(sourceSchema, 'wp_cabsa_capsula_avances')} AS a
     INNER JOIN ${tableName(targetSchema, 'contenido_capsulas')} AS c
       ON c.id = a.post_id AND c.status = 'published'
     ORDER BY a.fecha_actualizado, a.id`,
  );
  const latest = new Map();
  for (const record of legacyRows) {
    latest.set(`${record.user_id}:${record.post_id}`, record);
  }

  let migrated = 0;
  for (const record of latest.values()) {
    const userId = accountIdByWpUser.get(Number(record.user_id));
    const status = semaphoreStatus(record.estatus);
    if (!userId || !status) continue;
    const [existing] = await rows(
      `SELECT id, updated_at
       FROM ${tableName(targetSchema, 'analitica_progreso_capsulas')}
       WHERE user_id = ? AND capsule_id = ?
       LIMIT 1`,
      [userId, record.post_id],
    );
    if (existing && new Date(existing.updated_at) > new Date(record.fecha_actualizado)) {
      continue;
    }
    if (existing) {
      await connection.query(
        `UPDATE ${tableName(targetSchema, 'analitica_progreso_capsulas')}
         SET semaphore_status = ?, progress_percent = 100,
             completed_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          status,
          record.fecha_completado,
          record.fecha_actualizado,
          existing.id,
        ],
      );
    } else {
      await connection.query(
        `INSERT INTO ${tableName(targetSchema, 'analitica_progreso_capsulas')} (
           id, user_id, capsule_id, semaphore_status, progress_percent,
           completed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, 100, ?, ?, ?)`,
        [
          randomUUID(),
          userId,
          record.post_id,
          status,
          record.fecha_completado,
          record.fecha_completado,
          record.fecha_actualizado,
        ],
      );
    }
    migrated += 1;
  }
  return { source: legacyRows.length, migrated };
};

const migrateSenseiProgress = async (accountIdByWpUser) => {
  const comments = await rows(
    `SELECT
       c.comment_ID,
       c.comment_post_ID,
       c.user_id,
       c.comment_type,
       c.comment_approved,
       c.comment_date,
       l.course_id AS lesson_course_id,
       CASE WHEN tc.id IS NULL THEN 0 ELSE 1 END AS course_exists,
       CASE WHEN l.id IS NULL THEN 0 ELSE 1 END AS lesson_exists,
       MAX(CASE WHEN cm.meta_key = 'percent' THEN cm.meta_value END) AS percent_value
     FROM ${tableName(sourceSchema, 'wp_comments')} AS c
     LEFT JOIN ${tableName(sourceSchema, 'wp_commentmeta')} AS cm
       ON cm.comment_id = c.comment_ID
     LEFT JOIN ${tableName(targetSchema, 'academia_cursos')} AS tc
       ON tc.id = c.comment_post_ID
     LEFT JOIN ${tableName(targetSchema, 'academia_lecciones')} AS l
       ON l.id = c.comment_post_ID
     WHERE c.comment_type IN ('sensei_course_status', 'sensei_lesson_status')
       AND c.comment_approved <> 'post-trashed'
     GROUP BY
       c.comment_ID, c.comment_post_ID, c.user_id, c.comment_type,
       c.comment_approved, c.comment_date, l.course_id, tc.id, l.id
     ORDER BY c.comment_date, c.comment_ID`,
  );

  const latestCourse = new Map();
  const latestLesson = new Map();
  for (const comment of comments) {
    if (!accountIdByWpUser.has(Number(comment.user_id))) continue;
    if (comment.comment_type === 'sensei_course_status' && comment.course_exists) {
      latestCourse.set(`${comment.user_id}:${comment.comment_post_ID}`, comment);
    }
    if (comment.comment_type === 'sensei_lesson_status' && comment.lesson_exists) {
      latestLesson.set(`${comment.user_id}:${comment.comment_post_ID}`, comment);
    }
  }

  const enrollmentInputs = new Map();
  const ensureInput = (wpUserId, courseId, eventDate) => {
    const key = `${wpUserId}:${courseId}`;
    const current = enrollmentInputs.get(key) || {
      wpUserId: Number(wpUserId),
      courseId: Number(courseId),
      enrolledAt: eventDate,
      updatedAt: eventDate,
      courseStatus: null,
      courseCompletedAt: null,
      sourcePercent: null,
    };
    if (new Date(eventDate) < new Date(current.enrolledAt)) current.enrolledAt = eventDate;
    if (new Date(eventDate) > new Date(current.updatedAt)) current.updatedAt = eventDate;
    enrollmentInputs.set(key, current);
    return current;
  };

  for (const comment of latestCourse.values()) {
    const input = ensureInput(
      comment.user_id,
      comment.comment_post_ID,
      comment.comment_date,
    );
    input.courseStatus = comment.comment_approved;
    input.sourcePercent = Number(comment.percent_value || 0);
    if (comment.comment_approved === 'complete') {
      input.courseCompletedAt = comment.comment_date;
    }
  }
  for (const comment of latestLesson.values()) {
    ensureInput(comment.user_id, comment.lesson_course_id, comment.comment_date);
  }

  const enrollmentByUserCourse = new Map();
  let enrollmentsMigrated = 0;
  for (const [key, input] of enrollmentInputs) {
    const userId = accountIdByWpUser.get(input.wpUserId);
    if (!userId) continue;
    const lessonStates = [...latestLesson.values()].filter(
      (comment) => Number(comment.user_id) === input.wpUserId
        && Number(comment.lesson_course_id) === input.courseId,
    );
    const [lessonCount] = await rows(
      `SELECT COUNT(*) AS total
       FROM ${tableName(targetSchema, 'academia_lecciones')}
       WHERE course_id = ?`,
      [input.courseId],
    );
    const completedLessons = lessonStates.filter(
      (comment) => ['complete', 'passed'].includes(comment.comment_approved),
    ).length;
    const computedPercent = Number(lessonCount.total)
      ? Math.round((completedLessons / Number(lessonCount.total)) * 10000) / 100
      : 0;
    const isCompleted = input.courseStatus === 'complete';
    const progressPercent = isCompleted
      ? 100
      : Math.max(computedPercent, Math.min(100, input.sourcePercent || 0));

    const [existing] = await rows(
      `SELECT id, updated_at
       FROM ${tableName(targetSchema, 'academia_inscripciones')}
       WHERE user_id = ? AND course_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId, input.courseId],
    );
    let enrollmentId;
    if (existing) {
      enrollmentId = existing.id;
      if (new Date(existing.updated_at) <= new Date(input.updatedAt)) {
        await connection.query(
          `UPDATE ${tableName(targetSchema, 'academia_inscripciones')}
           SET legacy_wp_user_id = COALESCE(legacy_wp_user_id, ?),
               status = ?, enrolled_at = LEAST(enrolled_at, ?),
               completed_at = ?, progress_percent = ?, updated_at = ?
           WHERE id = ?`,
          [
            input.wpUserId,
            isCompleted ? 'COMPLETED' : 'ACTIVE',
            input.enrolledAt,
            input.courseCompletedAt,
            progressPercent,
            input.updatedAt,
            enrollmentId,
          ],
        );
      }
    } else {
      enrollmentId = randomUUID();
      await connection.query(
        `INSERT INTO ${tableName(targetSchema, 'academia_inscripciones')} (
           id, user_id, legacy_wp_user_id, course_id, status,
           enrolled_at, completed_at, progress_percent, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          enrollmentId,
          userId,
          input.wpUserId,
          input.courseId,
          isCompleted ? 'COMPLETED' : 'ACTIVE',
          input.enrolledAt,
          input.courseCompletedAt,
          progressPercent,
          input.enrolledAt,
          input.updatedAt,
        ],
      );
    }
    enrollmentByUserCourse.set(key, enrollmentId);
    enrollmentsMigrated += 1;
  }

  let lessonsMigrated = 0;
  const lessonCompletionsByUserDate = new Map();
  const lessonLastActivityByUserDate = new Map();
  for (const comment of latestLesson.values()) {
    const key = `${comment.user_id}:${comment.lesson_course_id}`;
    const enrollmentId = enrollmentByUserCourse.get(key);
    if (!enrollmentId) continue;
    const completed = ['complete', 'passed'].includes(comment.comment_approved);
    const status = completed ? 'COMPLETED' : 'IN_PROGRESS';
    const [existing] = await rows(
      `SELECT id, updated_at
       FROM ${tableName(targetSchema, 'academia_progreso_lecciones')}
       WHERE enrollment_id = ? AND lesson_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [enrollmentId, comment.comment_post_ID],
    );
    if (existing && new Date(existing.updated_at) > new Date(comment.comment_date)) {
      continue;
    }
    if (existing) {
      await connection.query(
        `UPDATE ${tableName(targetSchema, 'academia_progreso_lecciones')}
         SET status = ?, progress_percent = ?, started_at = COALESCE(started_at, ?),
             completed_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          status,
          completed ? 100 : 0,
          comment.comment_date,
          completed ? comment.comment_date : null,
          comment.comment_date,
          existing.id,
        ],
      );
    } else {
      await connection.query(
        `INSERT INTO ${tableName(targetSchema, 'academia_progreso_lecciones')} (
           id, enrollment_id, lesson_id, status, progress_percent,
           last_position_seconds, started_at, completed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [
          randomUUID(),
          enrollmentId,
          comment.comment_post_ID,
          status,
          completed ? 100 : 0,
          comment.comment_date,
          completed ? comment.comment_date : null,
          comment.comment_date,
          comment.comment_date,
        ],
      );
    }
    lessonsMigrated += 1;
    if (completed) {
      const date = new Date(comment.comment_date).toISOString().slice(0, 10);
      const completionKey = `${comment.user_id}:${date}`;
      lessonCompletionsByUserDate.set(
        completionKey,
        (lessonCompletionsByUserDate.get(completionKey) || 0) + 1,
      );
      const previousActivity = lessonLastActivityByUserDate.get(completionKey);
      if (
        !previousActivity
        || new Date(comment.comment_date) > new Date(previousActivity)
      ) {
        lessonLastActivityByUserDate.set(completionKey, comment.comment_date);
      }
    }
  }

  return {
    sourceComments: comments.length,
    enrollmentsMigrated,
    lessonsMigrated,
    lessonCompletionsByUserDate,
    lessonLastActivityByUserDate,
  };
};

const migrateLearningActivity = async (
  accountIdByWpUser,
  lessonCompletionsByUserDate,
  lessonLastActivityByUserDate,
) => {
  const activeDays = await rows(
    `SELECT user_id, fecha, ultimo_acceso, visitas
     FROM ${tableName(sourceSchema, 'wp_cabsa_dias_activos')}
     ORDER BY fecha, id`,
  );
  const capsuleCompletions = await rows(
    `SELECT
       user_id,
       DATE(fecha_completado) AS activity_date,
       COUNT(*) AS total,
       MAX(fecha_actualizado) AS last_activity_at
     FROM ${tableName(sourceSchema, 'wp_cabsa_capsula_avances')}
     GROUP BY user_id, DATE(fecha_completado)`,
  );
  const capsuleCountByUserDate = new Map(
    capsuleCompletions.map((record) => [
      `${record.user_id}:${new Date(record.activity_date).toISOString().slice(0, 10)}`,
      Number(record.total),
    ]),
  );
  const capsuleLastActivityByUserDate = new Map(
    capsuleCompletions.map((record) => [
      `${record.user_id}:${new Date(record.activity_date).toISOString().slice(0, 10)}`,
      record.last_activity_at,
    ]),
  );

  const activityByUserDate = new Map();
  for (const activeDay of activeDays) {
    const date = new Date(activeDay.fecha).toISOString().slice(0, 10);
    activityByUserDate.set(`${activeDay.user_id}:${date}`, {
      wpUserId: Number(activeDay.user_id),
      date,
      lastActivityAt: activeDay.ultimo_acceso,
      legacyActiveDay: true,
    });
  }
  const completionKeys = new Set([
    ...capsuleCountByUserDate.keys(),
    ...lessonCompletionsByUserDate.keys(),
  ]);
  for (const key of completionKeys) {
    if (activityByUserDate.has(key)) continue;
    const separator = key.indexOf(':');
    const wpUserId = Number(key.slice(0, separator));
    const date = key.slice(separator + 1);
    activityByUserDate.set(key, {
      wpUserId,
      date,
      lastActivityAt: lessonLastActivityByUserDate.get(key)
        || capsuleLastActivityByUserDate.get(key)
        || `${date} 12:00:00`,
      legacyActiveDay: false,
    });
  }

  let migrated = 0;
  for (const [key, activity] of activityByUserDate) {
    const wpUserId = activity.wpUserId;
    const userId = accountIdByWpUser.get(wpUserId);
    if (!userId) continue;
    const capsuleCount = activity.legacyActiveDay
      ? Math.max(1, capsuleCountByUserDate.get(key) || 0)
      : capsuleCountByUserDate.get(key) || 0;
    const lessonCount = lessonCompletionsByUserDate.get(key) || 0;
    await connection.query(
      `INSERT INTO ${tableName(targetSchema, 'analitica_actividad_aprendizaje')} (
         user_id, activity_date, capsule_completions, lesson_completions,
         last_activity_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         capsule_completions = GREATEST(capsule_completions, VALUES(capsule_completions)),
         lesson_completions = GREATEST(lesson_completions, VALUES(lesson_completions)),
         last_activity_at = GREATEST(last_activity_at, VALUES(last_activity_at)),
         updated_at = GREATEST(updated_at, VALUES(updated_at))`,
      [
        userId,
        activity.date,
        capsuleCount,
        lessonCount,
        activity.lastActivityAt,
        activity.lastActivityAt,
        activity.lastActivityAt,
      ],
    );
    migrated += 1;
  }
  return {
    sourceActiveDays: activeDays.length,
    completionDaysAdded: activityByUserDate.size - activeDays.length,
    migrated,
  };
};

const printAudit = async () => {
  console.log(`Fuente: ${sourceSchema}`);
  console.log(`Destino: ${targetSchema}`);
  console.log(`Modo: ${apply ? 'APLICAR' : 'SOLO AUDITORIA'}`);
  for (const [sourceTable, targetTable] of directMappings) {
    const [sourceCount, targetCount] = await Promise.all([
      scalarCount(sourceSchema, sourceTable),
      scalarCount(targetSchema, targetTable),
    ]);
    console.log(`${sourceTable} (${sourceCount}) -> ${targetTable} (${targetCount})`);
  }
  console.log(
    `wp_users (${await scalarCount(sourceSchema, 'wp_users')})`
    + ` -> usuarios_cuentas (${await scalarCount(targetSchema, 'usuarios_cuentas')})`,
  );
};

try {
  await printAudit();
  if (!apply) {
    console.log('Sin cambios. Usa --apply para ejecutar con respaldo previo.');
    process.exitCode = 0;
  } else {
    const backupSchema = await createBackup();
    console.log(`Respaldo creado: ${backupSchema}`);

    await connection.beginTransaction();
    try {
      const directResults = {};
      for (const [sourceTable, targetTable] of directMappings) {
        directResults[targetTable] = await copyCompatibleTable(
          sourceTable,
          targetTable,
        );
      }
      const accounts = await migrateAccounts();
      const capsules = await migrateCapsuleProgress(accounts.accountIdByWpUser);
      const sensei = await migrateSenseiProgress(accounts.accountIdByWpUser);
      const activity = await migrateLearningActivity(
        accounts.accountIdByWpUser,
        sensei.lessonCompletionsByUserDate,
        sensei.lessonLastActivityByUserDate,
      );
      await connection.commit();

      console.log('Migración confirmada.');
      console.log(JSON.stringify({
        backupSchema,
        directResults,
        accounts: {
          source: accounts.source,
          inserted: accounts.inserted,
          linked: accounts.linked,
          aliases: accounts.aliases,
          localRolesAssigned: accounts.localRolesAssigned,
        },
        capsules,
        sensei: {
          sourceComments: sensei.sourceComments,
          enrollmentsMigrated: sensei.enrollmentsMigrated,
          lessonsMigrated: sensei.lessonsMigrated,
        },
        activity,
      }, null, 2));
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
