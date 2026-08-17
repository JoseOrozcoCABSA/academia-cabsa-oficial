import { QueryTypes } from 'sequelize';
import database from '#config/database';

interface ColumnRow {
  COLUMN_NAME: string;
}

interface IndexRow {
  INDEX_NAME: string;
}

try {
  await database.authenticate();
  const columns = await database.query<ColumnRow>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'analitica_progreso_capsulas'
       AND COLUMN_NAME IN ('assessment', 'semaphore_status')`,
    { type: QueryTypes.SELECT },
  );
  const names = new Set(columns.map((column) => column.COLUMN_NAME));

  if (names.has('assessment') && !names.has('semaphore_status')) {
    await database.query(
      `ALTER TABLE analitica_progreso_capsulas
       MODIFY COLUMN assessment
       ENUM('UNDERSTOOD','REINFORCE','SUPPORT','GREEN','YELLOW','RED') NOT NULL`,
    );
    await database.query(
      `UPDATE analitica_progreso_capsulas
       SET assessment = CASE assessment
         WHEN 'UNDERSTOOD' THEN 'GREEN'
         WHEN 'REINFORCE' THEN 'YELLOW'
         WHEN 'SUPPORT' THEN 'RED'
         ELSE assessment
       END`,
    );
    await database.query(
      `ALTER TABLE analitica_progreso_capsulas
       CHANGE COLUMN assessment semaphore_status
       ENUM('GREEN','YELLOW','RED') NOT NULL`,
    );
  }

  const indexes = await database.query<IndexRow>(
    `SELECT DISTINCT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'analitica_progreso_capsulas'
       AND INDEX_NAME IN (
         'soa_capsule_progress_assessment',
         'soa_capsule_progress_semaphore_status'
       )`,
    { type: QueryTypes.SELECT },
  );
  const indexNames = new Set(indexes.map((index) => index.INDEX_NAME));
  if (indexNames.has('soa_capsule_progress_assessment')) {
    await database.query(
      `ALTER TABLE analitica_progreso_capsulas
       DROP INDEX soa_capsule_progress_assessment`,
    );
  }
  if (!indexNames.has('soa_capsule_progress_semaphore_status')) {
    await database.query(
      `ALTER TABLE analitica_progreso_capsulas
       ADD INDEX soa_capsule_progress_semaphore_status (semaphore_status)`,
    );
  }

  console.log('Modelo de cápsulas actualizado al Semáforo de aprendizaje.');
} finally {
  await database.close();
}
