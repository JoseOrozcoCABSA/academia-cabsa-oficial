import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  multipleStatements: true,
});

const target = process.env.DB_NAME || 'academia-soa';
const source = process.env.HISTORICAL_DB_NAME || 'academia_cabsa';
const q = (value) => `\`${String(value).replaceAll('`', '``')}\``;

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${q(target)}.usuarios_gestores_grupos (
      grupo_id BIGINT UNSIGNED NOT NULL,
      docente_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      limite_lugares SMALLINT UNSIGNED NOT NULL DEFAULT 30,
      creado_en DATETIME NOT NULL,
      actualizado_en DATETIME NOT NULL,
      PRIMARY KEY (grupo_id, docente_user_id),
      KEY docente_idx (docente_user_id),
      CONSTRAINT gestores_grupo_fk FOREIGN KEY (grupo_id)
        REFERENCES ${q(target)}.usuarios_grupos(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT gestores_docente_fk FOREIGN KEY (docente_user_id)
        REFERENCES ${q(target)}.usuarios_cuentas(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS ${q(target)}.usuarios_grupos_cuentas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      grupo_id BIGINT UNSIGNED NOT NULL,
      user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      creado_por_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      estado ENUM('ACTIVE','SUSPENDED','REMOVED') NOT NULL DEFAULT 'ACTIVE',
      agregado_en DATETIME NOT NULL,
      actualizado_en DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY grupo_usuario_unique (grupo_id, user_id),
      KEY user_idx (user_id),
      KEY creador_idx (creado_por_user_id),
      CONSTRAINT grupos_cuentas_grupo_fk FOREIGN KEY (grupo_id)
        REFERENCES ${q(target)}.usuarios_grupos(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT grupos_cuentas_user_fk FOREIGN KEY (user_id)
        REFERENCES ${q(target)}.usuarios_cuentas(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT grupos_cuentas_creador_fk FOREIGN KEY (creado_por_user_id)
        REFERENCES ${q(target)}.usuarios_cuentas(id) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS ${q(target)}.usuarios_activaciones_becas (
      id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      codigo VARCHAR(191) NOT NULL,
      nivel_membresia_id INT UNSIGNED NOT NULL,
      activado_en DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY codigo_unique (codigo),
      KEY user_idx (user_id),
      CONSTRAINT activaciones_user_fk FOREIGN KEY (user_id)
        REFERENCES ${q(target)}.usuarios_cuentas(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [columns] = await connection.query(
    `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=? AND TABLE_NAME='usuarios_codigos_beca_email'`,
    [target],
  );
  const existing = new Set(columns.map((column) => column.COLUMN_NAME));
  const additions = [
    ['legacy_code_id', 'BIGINT UNSIGNED NULL'],
    ['nivel_membresia_id', 'INT UNSIGNED NULL'],
    ['vigente_desde', 'DATE NULL'],
    ['vigente_hasta', 'DATE NULL'],
    ['max_usos', 'INT UNSIGNED NOT NULL DEFAULT 1'],
    ['usos_historicos', 'INT UNSIGNED NOT NULL DEFAULT 0'],
    ['usado_por_user_id', 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL'],
    ['usado_en', 'DATETIME NULL'],
  ];
  for (const [name, definition] of additions) {
    if (!existing.has(name)) {
      await connection.query(
        `ALTER TABLE ${q(target)}.usuarios_codigos_beca_email ADD COLUMN ${q(name)} ${definition}`,
      );
    }
  }

  await connection.query(`
    UPDATE ${q(target)}.usuarios_codigos_beca_email AS m
    INNER JOIN ${q(source)}.wp_pmpro_discount_codes AS c
      ON c.code=m.code
    LEFT JOIN ${q(source)}.wp_pmpro_discount_codes_levels AS l ON l.code_id=c.id
    LEFT JOIN (
      SELECT code_id, COUNT(*) AS total, MAX(timestamp) AS ultimo_uso
      FROM ${q(source)}.wp_pmpro_discount_codes_uses
      GROUP BY code_id
    ) AS u ON u.code_id=c.id
    SET m.legacy_code_id=c.id,
        m.nivel_membresia_id=l.level_id,
        m.vigente_desde=CASE WHEN YEAR(c.starts)=0 THEN NULL ELSE c.starts END,
        m.vigente_hasta=CASE WHEN YEAR(c.expires)=0 THEN NULL ELSE c.expires END,
        m.max_usos=CASE WHEN c.uses > 0 THEN c.uses ELSE 1 END,
        m.usos_historicos=COALESCE(u.total, 0),
        m.usado_en=COALESCE(m.usado_en, u.ultimo_uso);
  `);

  const teacherRoleId = randomUUID();
  await connection.query(
    `INSERT INTO ${q(target)}.usuarios_roles
       (id, code, name, description, is_system, created_at, updated_at)
     VALUES (?, 'TEACHER', 'Profesor', 'Administra un grupo de hasta 30 alumnos', 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), updated_at=NOW()`,
    [teacherRoleId],
  );
  const [[role]] = await connection.query(
    `SELECT id FROM ${q(target)}.usuarios_roles WHERE code='TEACHER' LIMIT 1`,
  );
  await connection.query(`
    INSERT IGNORE INTO ${q(target)}.usuarios_asignaciones_roles
      (user_id, role_id, assigned_by, created_at, updated_at)
    SELECT DISTINCT c.id, ?, NULL, NOW(), NOW()
    FROM ${q(target)}.usuarios_cuentas AS c
    INNER JOIN ${q(target)}.usuarios_membresias AS m
      ON m.user_id=c.legacy_wp_user_id
     AND m.membership_id=6
     AND m.status='active'
     AND (m.enddate IS NULL OR m.enddate >= NOW())
  `, [role.id]);

  const [teachers] = await connection.query(`
    SELECT DISTINCT c.id, c.display_name
    FROM ${q(target)}.usuarios_cuentas AS c
    INNER JOIN ${q(target)}.usuarios_asignaciones_roles AS ur ON ur.user_id=c.id
    INNER JOIN ${q(target)}.usuarios_roles AS r ON r.id=ur.role_id AND r.code='TEACHER'
    LEFT JOIN ${q(target)}.usuarios_gestores_grupos AS gg ON gg.docente_user_id=c.id
    WHERE gg.docente_user_id IS NULL
  `);
  for (const teacher of teachers) {
    const shortId = String(teacher.id).slice(0, 8);
    const name = `Grupo de ${String(teacher.display_name).trim()}`.slice(0, 170);
    const [result] = await connection.query(
      `INSERT INTO ${q(target)}.usuarios_grupos
        (nombre, descripcion, clave_estado, estado, clave_municipio, municipio,
         creado_por_wp_user_id, creado_en, actualizado_en)
       VALUES (?, 'Grupo académico administrado por el docente.', '', '', '', '', 0, NOW(), NOW())`,
      [`${name} · ${shortId}`],
    );
    await connection.query(
      `INSERT INTO ${q(target)}.usuarios_gestores_grupos
        (grupo_id, docente_user_id, limite_lugares, creado_en, actualizado_en)
       VALUES (?, ?, 30, NOW(), NOW())`,
      [result.insertId, teacher.id],
    );
  }

  const [[summary]] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM ${q(target)}.usuarios_roles WHERE code='TEACHER') AS roles,
      (SELECT COUNT(*) FROM ${q(target)}.usuarios_asignaciones_roles ur
        JOIN ${q(target)}.usuarios_roles r ON r.id=ur.role_id WHERE r.code='TEACHER') AS docentes,
      (SELECT COUNT(*) FROM ${q(target)}.usuarios_gestores_grupos) AS grupos_gestionables,
      (SELECT COUNT(*) FROM ${q(target)}.usuarios_codigos_beca_email
        WHERE nivel_membresia_id IS NOT NULL) AS codigos_enriquecidos
  `);
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await connection.end();
}
