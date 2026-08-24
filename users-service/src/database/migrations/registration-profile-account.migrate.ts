/** @file Migra perfiles, cuentas y almacenamiento aislado de sesiones JWT. */
import database from '#config/database';

async function migrate() {
  await database.query(
    `CREATE TABLE IF NOT EXISTS usuarios_sesiones_jwt (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME NULL,
      PRIMARY KEY (id),
      KEY user_sessions_user_idx (user_id,revoked_at),
      KEY user_sessions_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );

  // `usuarios_sesiones` pertenece al sistema heredado (payload/last_activity y
  // user_id numérico). No debe alterarse para guardar sesiones JWT. Si una
  // instalación anterior ya la convirtió al esquema JWT, se conservan sus
  // sesiones antes de continuar con la tabla dedicada.
  const [sessionColumns] = await database.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_sesiones'`,
  );
  const existingSessionColumns = new Set(
    (sessionColumns as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME),
  );
  if (
    existingSessionColumns.has('id')
    && existingSessionColumns.has('user_id')
    && existingSessionColumns.has('created_at')
  ) {
    const revokedAt = existingSessionColumns.has('revoked_at') ? 'revoked_at' : 'NULL';
    await database.query(
      `INSERT IGNORE INTO usuarios_sesiones_jwt (id,user_id,created_at,revoked_at)
       SELECT id,CAST(user_id AS CHAR),created_at,${revokedAt}
       FROM usuarios_sesiones
       WHERE id IS NOT NULL AND user_id IS NOT NULL AND created_at IS NOT NULL`,
    );
  }
  await database.query(
    'DELETE FROM usuarios_sesiones_jwt WHERE created_at<DATE_SUB(NOW(),INTERVAL 2 DAY)',
  );
  const [columns] = await database.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_fomaqro_registros'`,
  );
  const existing = new Set(
    (columns as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME),
  );
  if (!existing.has('account_user_id')) {
    await database.query(
      'ALTER TABLE usuarios_fomaqro_registros ADD COLUMN account_user_id CHAR(36) NULL AFTER user_id',
    );
  }

  const [indexes] = await database.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_fomaqro_registros'`,
  );
  const indexNames = new Set(
    (indexes as Array<{ INDEX_NAME: string }>).map((row) => row.INDEX_NAME),
  );
  if (!indexNames.has('fomaqro_account_user_idx')) {
    await database.query(
      'ALTER TABLE usuarios_fomaqro_registros ADD INDEX fomaqro_account_user_idx (account_user_id)',
    );
  }

  const [accountColumns] = await database.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_cuentas'`,
  );
  const accountExisting = new Set(
    (accountColumns as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME),
  );
  if (!accountExisting.has('scholarship_cancelled_at')) {
    await database.query(
      'ALTER TABLE usuarios_cuentas ADD COLUMN scholarship_cancelled_at DATETIME NULL AFTER last_login_at',
    );
  }

  const [activationColumns] = await database.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_activaciones_becas'`,
  );
  const activationExisting = new Set(
    (activationColumns as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME),
  );
  if (!activationExisting.has('suspended_at')) {
    await database.query(
      'ALTER TABLE usuarios_activaciones_becas ADD COLUMN suspended_at DATETIME NULL AFTER vigente_hasta',
    );
  }
  if (!activationExisting.has('patrocinador_activacion_id')) {
    await database.query(
      'ALTER TABLE usuarios_activaciones_becas ADD COLUMN patrocinador_activacion_id CHAR(36) NULL AFTER suspended_at',
    );
  }
  if (!activationExisting.has('grupo_origen_id')) {
    await database.query(
      'ALTER TABLE usuarios_activaciones_becas ADD COLUMN grupo_origen_id BIGINT UNSIGNED NULL AFTER patrocinador_activacion_id',
    );
  }

  await database.query(
    `CREATE TABLE IF NOT EXISTS usuarios_historial_miembros_grupos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      grupo_id BIGINT UNSIGNED NOT NULL,
      student_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      performed_by_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
      event_type ENUM('ADDED','STATUS_CHANGED','REMOVED','RESTORED','PROFILE_UPDATED','PASSWORD_RESET') NOT NULL,
      previous_status ENUM('ACTIVE','SUSPENDED','REMOVED') NULL,
      new_status ENUM('ACTIVE','SUSPENDED','REMOVED') NOT NULL,
      student_name VARCHAR(190) NOT NULL,
      student_email VARCHAR(190) NOT NULL,
      details JSON NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY group_member_history_group_idx (grupo_id,created_at),
      KEY group_member_history_student_idx (student_user_id,created_at),
      KEY group_member_history_event_idx (event_type,created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await database.query(
    `ALTER TABLE usuarios_historial_miembros_grupos
     MODIFY COLUMN event_type ENUM(
       'ADDED','STATUS_CHANGED','REMOVED','RESTORED','PROFILE_UPDATED','PASSWORD_RESET'
     ) NOT NULL`,
  );
  await database.query(
    `INSERT INTO usuarios_historial_miembros_grupos
      (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,
       new_status,student_name,student_email,details,created_at)
     SELECT gc.grupo_id,gc.user_id,gc.creado_por_user_id,
       IF(gc.estado='REMOVED','REMOVED','ADDED'),
       IF(gc.estado='REMOVED','ACTIVE',NULL),gc.estado,
       COALESCE(NULLIF(c.display_name,''),c.username,c.email),c.email,
       JSON_OBJECT('origin','migration'),
       IF(gc.estado='REMOVED',COALESCE(gc.actualizado_en,gc.agregado_en,NOW()),COALESCE(gc.agregado_en,gc.actualizado_en,NOW()))
     FROM usuarios_grupos_cuentas gc
     INNER JOIN usuarios_cuentas c ON c.id=gc.user_id
     WHERE NOT EXISTS (
       SELECT 1 FROM usuarios_historial_miembros_grupos h
       WHERE h.grupo_id=gc.grupo_id AND h.student_user_id=gc.user_id
     )`,
  );
  console.log('Migración del vínculo UUID del registro aplicada correctamente.');
  await database.query(
    `CREATE TABLE IF NOT EXISTS usuarios_accesos_beca_paginas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      nivel_membresia_id BIGINT UNSIGNED NOT NULL,
      seccion_codigo VARCHAR(60) NOT NULL,
      seccion_nombre VARCHAR(120) NOT NULL,
      descripcion VARCHAR(255) NULL,
      permitido TINYINT(1) NOT NULL DEFAULT 1,
      actualizado_por_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY scholarship_page_access_level_section_uq (nivel_membresia_id,seccion_codigo),
      KEY scholarship_page_access_section_idx (seccion_codigo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await database.query(
    `INSERT IGNORE INTO usuarios_accesos_beca_paginas
      (nivel_membresia_id,seccion_codigo,seccion_nombre,descripcion,permitido)
     SELECT levels.nivel,sections.codigo,sections.nombre,sections.descripcion,1
     FROM (SELECT 6 nivel UNION ALL SELECT 8 UNION ALL SELECT 11) levels
     CROSS JOIN (
       SELECT 'courses' codigo,'Cursos' nombre,'Catálogo y detalle de cursos' descripcion
       UNION ALL SELECT 'lessons','Lecciones','Lectura, exámenes y avance'
       UNION ALL SELECT 'media','Mediateca y cápsulas','Biblioteca, cápsulas y documentos'
       UNION ALL SELECT 'assistants','Asistentes IA','Asistentes y agentes GPT'
       UNION ALL SELECT 'tutors','Tutores IA','Tutores por nivel académico'
       UNION ALL SELECT 'forums','Foros','Foros, temas y participación'
       UNION ALL SELECT 'progress','Progreso','Gamificación, avance y certificados'
       UNION ALL SELECT 'support','Soporte','Peticiones y ayuda'
     ) sections`,
  );
  await database.query(
    `UPDATE usuarios_accesos_beca_paginas
     SET permitido=CASE
       WHEN nivel_membresia_id=6 THEN 1
       WHEN nivel_membresia_id IN (8,11) AND seccion_codigo IN ('assistants','forums') THEN 0
       ELSE 1 END
     WHERE actualizado_por_user_id IS NULL
       AND nivel_membresia_id IN (6,8,11)`,
  );
  // Cualquier nivel heredado o agregado fuera del panel aparece de forma segura:
  // todas sus secciones empiezan bloqueadas hasta que el administrador las habilite.
  await database.query(
    `INSERT IGNORE INTO usuarios_accesos_beca_paginas
      (nivel_membresia_id,seccion_codigo,seccion_nombre,descripcion,permitido)
     SELECT n.id,section_catalog.seccion_codigo,section_catalog.seccion_nombre,
            section_catalog.descripcion,0
     FROM usuarios_niveles_membresia n
     CROSS JOIN (
       SELECT seccion_codigo,MAX(seccion_nombre) seccion_nombre,MAX(descripcion) descripcion
       FROM usuarios_accesos_beca_paginas GROUP BY seccion_codigo
     ) section_catalog`,
  );
  await database.query(
    `CREATE TABLE IF NOT EXISTS usuarios_accesos_beca_recursos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      nivel_membresia_id BIGINT UNSIGNED NOT NULL,
      tipo_recurso VARCHAR(40) NOT NULL,
      clave_recurso VARCHAR(190) NOT NULL,
      permitido TINYINT(1) NOT NULL DEFAULT 1,
      actualizado_por_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY scholarship_resource_access_uq (nivel_membresia_id,tipo_recurso,clave_recurso),
      KEY scholarship_resource_access_lookup_idx (tipo_recurso,clave_recurso)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await database.query(
    `CREATE TABLE IF NOT EXISTS usuarios_reglas_dependientes_becas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      nivel_patrocinador_id BIGINT UNSIGNED NOT NULL,
      nivel_dependiente_id BIGINT UNSIGNED NOT NULL,
      nombre VARCHAR(160) NOT NULL,
      etiqueta_dependiente VARCHAR(80) NOT NULL DEFAULT 'Dependiente',
      limite_lugares INT UNSIGNED NOT NULL DEFAULT 1,
      hereda_vigencia TINYINT(1) NOT NULL DEFAULT 1,
      permite_seguimiento TINYINT(1) NOT NULL DEFAULT 1,
      activa TINYINT(1) NOT NULL DEFAULT 1,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY scholarship_dependent_sponsor_uq (nivel_patrocinador_id),
      KEY scholarship_dependent_level_idx (nivel_dependiente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await database.query(
    `INSERT IGNORE INTO usuarios_reglas_dependientes_becas
      (nivel_patrocinador_id,nivel_dependiente_id,nombre,etiqueta_dependiente,
       limite_lugares,hereda_vigencia,permite_seguimiento,activa)
     VALUES(6,8,'Beca Docente con Familia-Estudiante','Alumno',30,1,1,1)`,
  );
  // Vincula beneficios derivados históricos con la activación que los patrocina.
  // A partir de este vínculo, la vigencia nunca puede sobrevivir a la beca padre.
  await database.query(
    `UPDATE usuarios_activaciones_becas child
     INNER JOIN usuarios_codigos_beca_email code
       ON CONVERT(code.code USING utf8mb4) COLLATE utf8mb4_unicode_ci
        =CONVERT(child.codigo USING utf8mb4) COLLATE utf8mb4_unicode_ci
     INNER JOIN usuarios_grupos_cuentas member ON member.user_id=child.user_id
     INNER JOIN usuarios_gestores_grupos manager ON manager.grupo_id=member.grupo_id
     INNER JOIN usuarios_reglas_dependientes_becas rule
       ON rule.nivel_dependiente_id=child.nivel_membresia_id AND rule.activa=1
     INNER JOIN usuarios_activaciones_becas sponsor
       ON sponsor.user_id=manager.docente_user_id
      AND sponsor.nivel_membresia_id=rule.nivel_patrocinador_id
     SET child.patrocinador_activacion_id=sponsor.id,
         child.grupo_origen_id=member.grupo_id,
         child.vigente_hasta=CASE WHEN rule.hereda_vigencia=1
           THEN sponsor.vigente_hasta ELSE child.vigente_hasta END
     WHERE child.patrocinador_activacion_id IS NULL
       AND code.lote=CONCAT('GRUPO-',member.grupo_id)`,
  );
  await database.query(
    `INSERT IGNORE INTO usuarios_roles
      (id,code,name,description,is_system,created_at,updated_at)
     VALUES('00000000-0000-4000-8000-000000000012','ADVISOR','Asesor',
      'Gestiona exclusivamente sus grupos, usuarios y becas',1,NOW(),NOW())`,
  );
  await database.query(
    `CREATE TABLE IF NOT EXISTS usuarios_asesores_grupos (
      advisor_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      grupo_id BIGINT UNSIGNED NOT NULL,
      created_by_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (advisor_user_id,grupo_id),
      KEY advisor_groups_group_idx (grupo_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await database.query(
    `CREATE TABLE IF NOT EXISTS usuarios_asesores_usuarios (
      advisor_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      grupo_id BIGINT UNSIGNED NOT NULL,
      nivel_membresia_id BIGINT UNSIGNED NOT NULL,
      activation_mode ENUM('DIRECT','CODE') NOT NULL,
      scholarship_code VARCHAR(100) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (advisor_user_id,user_id),
      UNIQUE KEY advisor_managed_user_uq (user_id),
      KEY advisor_managed_group_idx (grupo_id),
      KEY advisor_managed_scholarship_idx (nivel_membresia_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

migrate()
  .then(() => database.close())
  .catch(async (error) => {
    console.error(error);
    await database.close();
    process.exitCode = 1;
  });
