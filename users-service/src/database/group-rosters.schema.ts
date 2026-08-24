import database from '#config/database';

/**
 * Estructura persistente para los padrones comparativos cargados por grupo.
 * Se conserva cada importacion; solo una queda marcada como vigente por grupo.
 */
export async function ensureGroupRosterSchema() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS usuarios_padrones_esperados (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      nombre VARCHAR(190) NOT NULL,
      descripcion TEXT NULL,
      clave_estado VARCHAR(2) NOT NULL DEFAULT '',
      estado VARCHAR(190) NOT NULL DEFAULT '',
      clave_municipio VARCHAR(3) NOT NULL DEFAULT '',
      municipio VARCHAR(190) NOT NULL DEFAULT '',
      activo TINYINT(1) NOT NULL DEFAULT 1,
      creado_por_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY expected_roster_active_name_idx (activo,nombre),
      KEY expected_roster_region_idx (clave_estado,clave_municipio)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS usuarios_base_central_importaciones (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      nombre_archivo VARCHAR(255) NOT NULL,
      nombre_hoja VARCHAR(190) NULL,
      total_filas INT UNSIGNED NOT NULL DEFAULT 0,
      es_vigente TINYINT(1) NOT NULL DEFAULT 1,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY central_import_current_idx (es_vigente,creado_en)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS usuarios_base_central_filas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      importacion_id BIGINT UNSIGNED NOT NULL,
      numero_fila INT UNSIGNED NOT NULL,
      rfc VARCHAR(24) NOT NULL DEFAULT '',
      nombre VARCHAR(255) NOT NULL DEFAULT '',
      correo VARCHAR(190) NOT NULL DEFAULT '',
      correo_oficial VARCHAR(190) NOT NULL DEFAULT '',
      codigo VARCHAR(190) NOT NULL DEFAULT '',
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY central_row_import_line_uq (importacion_id,numero_fila),
      KEY central_row_email_idx (importacion_id,correo),
      KEY central_row_official_email_idx (importacion_id,correo_oficial),
      KEY central_row_rfc_idx (importacion_id,rfc),
      KEY central_row_code_idx (importacion_id,codigo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS usuarios_padrones_grupos_importaciones (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      grupo_id BIGINT UNSIGNED NOT NULL,
      nombre_archivo VARCHAR(255) NOT NULL,
      nombre_hoja VARCHAR(190) NULL,
      nivel_membresia_id BIGINT UNSIGNED NULL,
      vigente_desde DATE NULL,
      vigente_hasta DATE NULL,
      total_filas INT UNSIGNED NOT NULL DEFAULT 0,
      es_vigente TINYINT(1) NOT NULL DEFAULT 1,
      importado_por_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY roster_import_group_current_idx (grupo_id,es_vigente,creado_en),
      KEY roster_import_actor_idx (importado_por_user_id,creado_en)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS usuarios_padrones_grupos_filas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      importacion_id BIGINT UNSIGNED NOT NULL,
      grupo_id BIGINT UNSIGNED NOT NULL,
      numero_fila INT UNSIGNED NOT NULL,
      correo VARCHAR(190) NOT NULL DEFAULT '',
      codigo VARCHAR(190) NOT NULL DEFAULT '',
      rfc VARCHAR(24) NOT NULL DEFAULT '',
      nombre VARCHAR(255) NOT NULL DEFAULT '',
      usuario VARCHAR(120) NOT NULL DEFAULT '',
      datos_adicionales JSON NULL,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY roster_row_import_line_uq (importacion_id,numero_fila),
      KEY roster_row_group_email_idx (grupo_id,correo),
      KEY roster_row_group_code_idx (grupo_id,codigo),
      KEY roster_row_import_idx (importacion_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS usuarios_padrones_grupos_historial (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      grupo_id BIGINT UNSIGNED NOT NULL,
      importacion_id BIGINT UNSIGNED NULL,
      accion VARCHAR(40) NOT NULL,
      afectados INT UNSIGNED NOT NULL DEFAULT 0,
      realizado_por_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
      detalle JSON NULL,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY roster_history_group_idx (grupo_id,creado_en),
      KEY roster_history_import_idx (importacion_id,creado_en)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Migracion idempotente: los antiguos grupos con padron pasan al catalogo
  // independiente conservando el id para mantener su historial de cargas.
  await database.query(`
    INSERT INTO usuarios_padrones_esperados
      (id,nombre,descripcion,clave_estado,estado,clave_municipio,municipio,
       activo,creado_por_user_id,creado_en,actualizado_en)
    SELECT g.id,g.nombre,g.descripcion,g.clave_estado,g.estado,g.clave_municipio,g.municipio,
      1,NULL,g.creado_en,g.actualizado_en
    FROM usuarios_grupos g
    WHERE EXISTS (
      SELECT 1 FROM usuarios_padrones_grupos_importaciones i WHERE i.grupo_id=g.id
    ) AND NOT EXISTS (
      SELECT 1 FROM usuarios_gestores_grupos gestor WHERE gestor.grupo_id=g.id
    )
    ON DUPLICATE KEY UPDATE nombre=VALUES(nombre),descripcion=VALUES(descripcion),
      clave_estado=VALUES(clave_estado),estado=VALUES(estado),
      clave_municipio=VALUES(clave_municipio),municipio=VALUES(municipio)
  `);
}
