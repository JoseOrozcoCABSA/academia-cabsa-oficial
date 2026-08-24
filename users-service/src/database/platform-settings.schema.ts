import database from '#config/database';

export async function ensurePlatformSettingsSchema() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS usuarios_configuracion_plataforma (
      clave VARCHAR(100) NOT NULL PRIMARY KEY,
      valor VARCHAR(255) NOT NULL,
      descripcion VARCHAR(500) NULL,
      actualizado_por CHAR(36) NULL,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    INSERT IGNORE INTO usuarios_configuracion_plataforma (clave, valor, descripcion)
    VALUES (
      'scholarship_self_cancellation_enabled',
      '0',
      'Permite que los beneficiarios cancelen su propia beca desde el portal'
    )
  `);
}
