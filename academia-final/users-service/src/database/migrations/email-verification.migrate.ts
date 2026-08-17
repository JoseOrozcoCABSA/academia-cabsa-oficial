import database from '#config/database';

async function migrate() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS usuarios_verificaciones_email (
      user_id CHAR(36) NOT NULL,
      code_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      sent_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (user_id),
      INDEX email_verification_expiry_idx (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Migración de verificación de correo aplicada correctamente.');
}

migrate()
  .then(() => database.close())
  .catch(async (error) => {
    console.error(error);
    await database.close();
    process.exitCode = 1;
  });
