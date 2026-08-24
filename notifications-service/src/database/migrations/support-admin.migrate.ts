import database from '#config/database';

async function migrate() {
  const [columns] = await database.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notificaciones_soporte_tickets'`,
  );
  const existing = new Set((columns as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME));
  if (!existing.has('asignado_user_id')) {
    await database.query(
      'ALTER TABLE notificaciones_soporte_tickets ADD COLUMN asignado_user_id CHAR(36) NULL AFTER asignado_a, ADD INDEX soporte_asignado_user_idx (asignado_user_id)',
    );
  }
  if (!existing.has('notificado_en')) {
    await database.query(
      'ALTER TABLE notificaciones_soporte_tickets ADD COLUMN notificado_en DATETIME NULL AFTER cerrado_en',
    );
  }
  await database.query(`
    CREATE TABLE IF NOT EXISTS notificaciones_soporte_seguimiento (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ticket_id BIGINT UNSIGNED NOT NULL,
      actor_user_id CHAR(36) NOT NULL,
      estado_anterior VARCHAR(40) NULL,
      estado_nuevo VARCHAR(40) NOT NULL,
      prioridad_anterior VARCHAR(40) NULL,
      prioridad_nueva VARCHAR(40) NOT NULL,
      asignado_anterior CHAR(36) NULL,
      asignado_nuevo CHAR(36) NULL,
      respuesta LONGTEXT NULL,
      notificacion_solicitada TINYINT(1) NOT NULL DEFAULT 0,
      notificacion_enviada TINYINT(1) NOT NULL DEFAULT 0,
      creado_en DATETIME NOT NULL,
      PRIMARY KEY (id),
      INDEX soporte_seguimiento_ticket_idx (ticket_id,creado_en),
      INDEX soporte_seguimiento_actor_idx (actor_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Migración del gestor de peticiones aplicada correctamente.');
}

migrate()
  .then(() => database.close())
  .catch(async (error) => {
    console.error(error);
    await database.close();
    process.exitCode = 1;
  });
