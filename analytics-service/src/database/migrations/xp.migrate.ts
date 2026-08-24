import database from '#config/database';

const learningXpEventsSql = `
  CREATE TABLE IF NOT EXISTS analitica_eventos_xp (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    event_type ENUM('LESSON_COMPLETED','COURSE_COMPLETED') NOT NULL,
    source_id VARCHAR(80) NOT NULL,
    course_id BIGINT UNSIGNED NOT NULL,
    lesson_id BIGINT UNSIGNED NULL,
    points INT UNSIGNED NOT NULL,
    description VARCHAR(255) NOT NULL,
    earned_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY soa_learning_xp_events_unique_source (user_id, event_type, source_id),
    KEY soa_learning_xp_events_user_id (user_id),
    KEY soa_learning_xp_events_course_id (course_id),
    KEY soa_learning_xp_events_lesson_id (lesson_id),
    KEY soa_learning_xp_events_earned_at (earned_at),
    CONSTRAINT soa_learning_xp_events_course_fk
      FOREIGN KEY (course_id) REFERENCES academia_cursos (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT soa_learning_xp_events_lesson_fk
      FOREIGN KEY (lesson_id) REFERENCES academia_lecciones (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

try {
  await database.authenticate();
  await database.query(learningXpEventsSql);
  console.log('Migración de puntos XP aplicada correctamente.');
} finally {
  await database.close();
}
