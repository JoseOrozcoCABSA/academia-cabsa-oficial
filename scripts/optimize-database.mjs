#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromUsers = createRequire(path.join(root, 'users-service', 'package.json'));
const mysql = requireFromUsers('mysql2/promise');

function parseEnv(text) {
  const values = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const position = line.indexOf('=');
    if (position > 0) values[line.slice(0, position)] = line.slice(position + 1);
  }
  return values;
}

const configPath = path.join(root, '.env');
const env = parseEnv(await readFile(configPath, 'utf8'));
const databaseName = env.DB_NAME;
if (!/^[A-Za-z0-9_-]+$/.test(databaseName || '')) {
  throw new Error('DB_NAME no es valido');
}

const indexes = [
  {
    table: 'usuarios_grupos_cuentas',
    name: 'scale_group_state_user_idx',
    columns: '`grupo_id`,`estado`,`user_id`',
  },
  {
    table: 'academia_inscripciones',
    name: 'scale_enrollment_updated_user_idx',
    columns: '`updated_at`,`user_id`,`course_id`',
  },
  {
    table: 'analitica_progreso_capsulas',
    name: 'scale_capsule_updated_status_user_idx',
    columns: '`updated_at`,`semaphore_status`,`user_id`',
  },
  {
    table: 'analitica_eventos_asistentes_ia',
    name: 'scale_ai_created_type_area_idx',
    columns: '`created_at`,`event_type`,`area`',
  },
  {
    table: 'analitica_eventos_asistentes_ia',
    name: 'scale_ai_account_created_idx',
    columns: '`account_id`,`created_at`',
  },
  {
    table: 'academia_progreso_lecciones',
    name: 'scale_lesson_updated_status_enrollment_idx',
    columns: '`updated_at`,`status`,`enrollment_id`',
  },
  {
    table: 'usuarios_cuentas',
    name: 'scale_accounts_status_created_idx',
    columns: '`status`,`created_at`',
  },
];

const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: databaseName,
  charset: 'utf8mb4',
  connectTimeout: 10_000,
});

try {
  for (const index of indexes) {
    const [tables] = await connection.execute(
      `SELECT COUNT(*) total FROM information_schema.tables
       WHERE table_schema=? AND table_name=?`,
      [databaseName, index.table],
    );
    if (!Number(tables[0]?.total)) {
      console.log(`OMITIDO ${index.table}: la tabla no existe`);
      continue;
    }
    const [existing] = await connection.execute(
      `SELECT COUNT(*) total FROM information_schema.statistics
       WHERE table_schema=? AND table_name=? AND index_name=?`,
      [databaseName, index.table, index.name],
    );
    if (Number(existing[0]?.total)) {
      console.log(`LISTO   ${index.table}.${index.name}`);
      continue;
    }
    await connection.query(
      `ALTER TABLE \`${index.table}\` ADD INDEX \`${index.name}\` (${index.columns})`,
    );
    console.log(`CREADO  ${index.table}.${index.name}`);
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS notificaciones_cola_correos (
      id CHAR(36) NOT NULL,
      kind VARCHAR(50) NOT NULL,
      recipient VARCHAR(320) NOT NULL,
      payload JSON NOT NULL,
      status ENUM('PENDING','PROCESSING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locked_at DATETIME NULL,
      locked_by VARCHAR(80) NULL,
      message_id VARCHAR(255) NULL,
      last_error VARCHAR(1000) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME NULL,
      PRIMARY KEY (id),
      KEY mail_queue_claim_idx (status, available_at, created_at),
      KEY mail_queue_recipient_idx (recipient, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [variables] = await connection.query(
    `SHOW VARIABLES WHERE Variable_name IN
     ('max_connections','innodb_buffer_pool_size','version')`,
  );
  console.log('COLA    notificaciones_cola_correos lista');
  for (const variable of variables) {
    console.log(`${variable.Variable_name}=${variable.Value}`);
  }
} finally {
  await connection.end();
}
