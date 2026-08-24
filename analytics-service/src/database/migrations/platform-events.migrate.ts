/** @file Crea y evoluciona el almacenamiento privado de eventos de navegación. */
import database from '#config/database';

const statement = `CREATE TABLE IF NOT EXISTS analitica_eventos_plataforma (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type ENUM('PAGE_VIEW','CLICK') NOT NULL,
  section VARCHAR(80) NOT NULL,
  action VARCHAR(160) NULL,
  path VARCHAR(255) NOT NULL,
  account_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  role_code VARCHAR(40) NULL,
  session_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NULL,
  device ENUM('desktop','tablet','mobile') NOT NULL DEFAULT 'desktop',
  dedupe_key CHAR(64) NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY platform_events_created_idx (created_at),
  KEY platform_events_section_idx (section,event_type,created_at),
  KEY platform_events_account_idx (account_id,created_at),
  KEY platform_events_role_idx (role_code,created_at),
  UNIQUE KEY platform_events_dedupe_uq (dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const countersStatement = `CREATE TABLE IF NOT EXISTS analitica_limites_eventos (
  scope_hash CHAR(64) NOT NULL,
  window_kind VARCHAR(16) NOT NULL,
  window_start DATETIME NOT NULL,
  event_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (scope_hash,window_kind,window_start),
  KEY analytics_limits_cleanup_idx (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

try {
  await database.authenticate();
  await database.query(statement);
  const queryInterface = database.getQueryInterface();
  const platformColumns = await queryInterface.describeTable('analitica_eventos_plataforma');
  if (!platformColumns.dedupe_key) {
    await database.query('ALTER TABLE analitica_eventos_plataforma ADD COLUMN dedupe_key CHAR(64) NULL AFTER session_hash');
  }
  if (!platformColumns.ip_hash) {
    await database.query('ALTER TABLE analitica_eventos_plataforma ADD COLUMN ip_hash CHAR(64) NULL AFTER session_hash');
  }
  if (!platformColumns.device) {
    await database.query("ALTER TABLE analitica_eventos_plataforma ADD COLUMN device ENUM('desktop','tablet','mobile') NOT NULL DEFAULT 'desktop' AFTER ip_hash");
  }
  const aiColumns = await queryInterface.describeTable('analitica_eventos_asistentes_ia');
  if (!aiColumns.dedupe_key) {
    await database.query('ALTER TABLE analitica_eventos_asistentes_ia ADD COLUMN dedupe_key CHAR(64) NULL AFTER session_hash');
  }
  const platformIndexes = await queryInterface.showIndex('analitica_eventos_plataforma') as unknown as Array<{ name: string }>;
  if (!platformIndexes.some((index) => index.name === 'platform_events_dedupe_uq')) {
    await queryInterface.addIndex('analitica_eventos_plataforma', ['dedupe_key'], {
      name: 'platform_events_dedupe_uq', unique: true,
    });
  }
  const aiIndexes = await queryInterface.showIndex('analitica_eventos_asistentes_ia') as unknown as Array<{ name: string }>;
  if (!aiIndexes.some((index) => index.name === 'analytics_ai_dedupe_uq')) {
    await queryInterface.addIndex('analitica_eventos_asistentes_ia', ['dedupe_key'], {
      name: 'analytics_ai_dedupe_uq', unique: true,
    });
  }
  await database.query(countersStatement);
  await database.query('DELETE FROM analitica_limites_eventos WHERE window_start < NOW() - INTERVAL 8 DAY');
  console.log('Migración de eventos de plataforma aplicada correctamente.');
} finally {
  await database.close();
}
