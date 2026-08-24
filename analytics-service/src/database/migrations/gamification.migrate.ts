import database from '#config/database';

const capsuleProgressSql = `
  CREATE TABLE IF NOT EXISTS analitica_progreso_capsulas (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    capsule_id BIGINT UNSIGNED NOT NULL,
    semaphore_status ENUM('GREEN','YELLOW','RED') NOT NULL,
    progress_percent DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    completed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY soa_capsule_progress_user_capsule (user_id, capsule_id),
    KEY soa_capsule_progress_capsule_id (capsule_id),
    KEY soa_capsule_progress_semaphore_status (semaphore_status),
    CONSTRAINT soa_capsule_progress_capsule_fk
      FOREIGN KEY (capsule_id) REFERENCES contenido_capsulas (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const activityDaysSql = `
  CREATE TABLE IF NOT EXISTS analitica_actividad_aprendizaje (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    activity_date DATE NOT NULL,
    capsule_completions INT UNSIGNED NOT NULL DEFAULT 0,
    lesson_completions INT UNSIGNED NOT NULL DEFAULT 0,
    last_activity_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY soa_learning_activity_days_user_date (user_id, activity_date),
    KEY soa_learning_activity_days_activity_date (activity_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

try {
  await database.authenticate();
  await database.query(capsuleProgressSql);
  await database.query(activityDaysSql);
  console.log('Migración de gamificación aplicada correctamente.');
} finally {
  await database.close();
}
