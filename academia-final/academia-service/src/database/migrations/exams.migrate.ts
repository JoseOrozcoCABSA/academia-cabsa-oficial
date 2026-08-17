import database from '#config/database';
import { DataTypes } from 'sequelize';

const statements = [
  `CREATE TABLE IF NOT EXISTS academia_tiempo_lectura (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    lesson_id BIGINT UNSIGNED NOT NULL,
    accumulated_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    started_at DATETIME NULL,
    last_heartbeat_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY academia_reading_timer_user_lesson_unique (user_id,lesson_id),
    KEY academia_reading_timer_lesson_idx (lesson_id,updated_at),
    CONSTRAINT academia_reading_timer_lesson_fk FOREIGN KEY (lesson_id)
      REFERENCES academia_lecciones(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS academia_examenes (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    lesson_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    passing_score DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    max_attempts INT UNSIGNED NOT NULL DEFAULT 3,
    shuffle_questions TINYINT(1) NOT NULL DEFAULT 0,
    show_answers_after_submit TINYINT(1) NOT NULL DEFAULT 1,
    status ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY academia_exams_lesson_unique (lesson_id),
    KEY academia_exams_status_idx (status),
    CONSTRAINT academia_exams_lesson_fk FOREIGN KEY (lesson_id)
      REFERENCES academia_lecciones(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS academia_examen_preguntas (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    exam_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    question_type ENUM('MULTIPLE_CHOICE','TRUE_FALSE') NOT NULL,
    prompt TEXT NOT NULL,
    explanation TEXT NULL,
    points DECIMAL(7,2) NOT NULL DEFAULT 1.00,
    position INT UNSIGNED NOT NULL,
    is_required TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY academia_exam_questions_exam_idx (exam_id,position),
    CONSTRAINT academia_exam_questions_exam_fk FOREIGN KEY (exam_id)
      REFERENCES academia_examenes(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS academia_examen_opciones (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    question_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    option_text TEXT NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    position INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    KEY academia_exam_options_question_idx (question_id,position),
    CONSTRAINT academia_exam_options_question_fk FOREIGN KEY (question_id)
      REFERENCES academia_examen_preguntas(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS academia_examen_intentos (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    exam_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    attempt_number INT UNSIGNED NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    earned_points DECIMAL(9,2) NOT NULL,
    total_points DECIMAL(9,2) NOT NULL,
    passed TINYINT(1) NOT NULL,
    started_at DATETIME NOT NULL,
    submitted_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY academia_exam_attempt_number_unique (exam_id,user_id,attempt_number),
    KEY academia_exam_attempt_user_idx (user_id,submitted_at),
    CONSTRAINT academia_exam_attempt_exam_fk FOREIGN KEY (exam_id)
      REFERENCES academia_examenes(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS academia_examen_respuestas (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    attempt_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    question_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    question_prompt TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    selected_option_text TEXT NULL,
    correct_option_text TEXT NOT NULL,
    is_correct TINYINT(1) NOT NULL,
    points_awarded DECIMAL(9,2) NOT NULL,
    PRIMARY KEY (id),
    KEY academia_exam_answers_attempt_idx (attempt_id),
    CONSTRAINT academia_exam_answers_attempt_fk FOREIGN KEY (attempt_id)
      REFERENCES academia_examen_intentos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT academia_exam_answers_question_fk FOREIGN KEY (question_id)
      REFERENCES academia_examen_preguntas(id) ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

try {
  await database.authenticate();
  const lessonColumns = await database.getQueryInterface().describeTable('academia_lecciones');
  if (!lessonColumns.lesson_type) {
    await database.getQueryInterface().addColumn('academia_lecciones', 'lesson_type', {
      type: DataTypes.ENUM('CONTENT', 'EXAM', 'PRACTICE', 'RESOURCE'),
      allowNull: false,
      defaultValue: 'CONTENT',
    });
  }
  if (!lessonColumns.minimum_reading_seconds) {
    await database.getQueryInterface().addColumn('academia_lecciones', 'minimum_reading_seconds', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 300,
    });
  }
  const courseColumns = await database.getQueryInterface().describeTable('academia_cursos');
  if (!courseColumns.reading_timer_enabled) {
    await database.getQueryInterface().addColumn('academia_cursos', 'reading_timer_enabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }
  for (const statement of statements) await database.query(statement);
  await database.query(
    `UPDATE academia_lecciones l
     INNER JOIN academia_examenes e ON e.lesson_id=l.id
     SET l.lesson_type='EXAM'
     WHERE l.lesson_type<>'EXAM'`,
  );
  console.log('Migración de exámenes aplicada correctamente.');
} finally {
  await database.close();
}
