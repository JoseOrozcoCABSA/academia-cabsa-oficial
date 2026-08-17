import { QueryTypes, type Transaction } from 'sequelize';
import { randomUUID } from 'node:crypto';
import database from '#config/database';

export class ScholarshipActivationRepository {
  async lockScholarshipCode(code: string, transaction: Transaction) {
    const records = await database.query<{
      code: string;
      allowed_email: string;
      nivel_membresia_id: number | null;
      vigente_desde: Date | string | null;
      vigente_hasta: Date | string | null;
      max_usos: number;
      usos_historicos: number;
      usado_por_user_id: string | null;
      estado: string;
      membership_name: string;
    }>(
      `SELECT c.code,c.allowed_email,c.nivel_membresia_id,c.vigente_desde,c.vigente_hasta,
              c.max_usos,c.usos_historicos,c.usado_por_user_id,c.estado,
              COALESCE(n.name,CONCAT('Beca CABSA #',c.nivel_membresia_id)) AS membership_name
       FROM usuarios_codigos_beca_email c
       LEFT JOIN usuarios_niveles_membresia n ON n.id=c.nivel_membresia_id
       WHERE c.code=:code LIMIT 1 FOR UPDATE`,
      { replacements: { code }, type: QueryTypes.SELECT, transaction },
    );
    return records[0] ?? null;
  }

  async activationForUser(userId: string) {
    const records = await database.query<{
      id: string;
      nivel_membresia_id: number;
      activated_at: Date;
      membership_name: string;
    }>(
      `SELECT a.id,a.nivel_membresia_id,a.activado_en AS activated_at,
              COALESCE(n.name, CONCAT('Beca CABSA #',a.nivel_membresia_id)) AS membership_name
       FROM usuarios_activaciones_becas a
       LEFT JOIN usuarios_niveles_membresia n ON n.id=a.nivel_membresia_id
       WHERE a.user_id=:userId ORDER BY a.activado_en DESC LIMIT 1`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
    return records[0] ?? null;
  }

  async activateScholarship(
    userId: string,
    code: string,
    levelId: number,
    displayName: string,
    transaction: Transaction,
  ) {
    // Dos códigos distintos del mismo docente bloquean filas distintas. La
    // cuenta es el candado común que serializa la creación de su grupo.
    await database.query(
      'SELECT id FROM usuarios_cuentas WHERE id=:userId LIMIT 1 FOR UPDATE',
      { replacements: { userId }, type: QueryTypes.SELECT, transaction },
    );
    const active = await database.query<{ id: string }>(
      `SELECT id FROM usuarios_activaciones_becas
       WHERE user_id=:userId AND nivel_membresia_id=:levelId
         AND suspended_at IS NULL
         AND (vigente_hasta IS NULL OR vigente_hasta>=CURDATE())
       LIMIT 1`,
      { replacements: { userId, levelId }, type: QueryTypes.SELECT, transaction },
    );
    if (active[0]) return false;
    await database.query(
      `INSERT INTO usuarios_activaciones_becas
       (id,user_id,codigo,nivel_membresia_id,activado_en,vigente_hasta)
       SELECT :id,:userId,:code,:levelId,NOW(),vigente_hasta
       FROM usuarios_codigos_beca_email WHERE code=:code LIMIT 1`,
      {
        replacements: { id: randomUUID(), userId, code, levelId },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
    await database.query(
      `UPDATE usuarios_codigos_beca_email
       SET usado_por_user_id=:userId,usado_en=NOW(),updated_at=NOW()
       WHERE code=:code`,
      { replacements: { userId, code }, type: QueryTypes.UPDATE, transaction },
    );
    await database.query(
      `UPDATE usuarios_cuentas
       SET scholarship_cancelled_at=NULL,updated_at=NOW() WHERE id=:userId`,
      { replacements: { userId }, type: QueryTypes.UPDATE, transaction },
    );
    const roleCode = levelId === 6 ? 'TEACHER' : 'STUDENT';
    await database.query(
      `INSERT IGNORE INTO usuarios_asignaciones_roles
       (user_id,role_id,assigned_by,created_at,updated_at)
       SELECT :userId,id,NULL,NOW(),NOW() FROM usuarios_roles
       WHERE code=:roleCode LIMIT 1`,
      {
        replacements: { userId, roleCode },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
    const dependentRules = await database.query<{ nombre: string; limite_lugares: number }>(
      `SELECT nombre,limite_lugares
       FROM usuarios_reglas_dependientes_becas
       WHERE nivel_patrocinador_id=:levelId AND activa=1 LIMIT 1`,
      { replacements: { levelId }, type: QueryTypes.SELECT, transaction },
    );
    const dependentRule = dependentRules[0];
    if (dependentRule) {
      const [existing] = await database.query(
        `SELECT grupo_id FROM usuarios_gestores_grupos
         WHERE docente_user_id=:userId LIMIT 1`,
        { replacements: { userId }, type: QueryTypes.SELECT, transaction },
      );
      if (!existing) {
        const [created] = await database.query(
          `INSERT INTO usuarios_grupos
           (nombre,descripcion,clave_estado,estado,clave_municipio,municipio,
            creado_por_wp_user_id,creado_en,actualizado_en)
           VALUES (:name,:description,'','','','',0,NOW(),NOW())`,
          {
            replacements: {
              name: `Grupo de ${displayName} · ${userId.slice(0, 8)}`.slice(0, 190),
              description: dependentRule.nombre,
            },
            type: QueryTypes.INSERT,
            transaction,
          },
        );
        await database.query(
          `INSERT INTO usuarios_gestores_grupos
           (grupo_id,docente_user_id,limite_lugares,creado_en,actualizado_en)
           VALUES (:groupId,:userId,:seatLimit,NOW(),NOW())`,
          {
            replacements: { groupId: created, userId, seatLimit: dependentRule.limite_lugares },
            type: QueryTypes.INSERT,
            transaction,
          },
        );
      }
    }
    return true;
  }

  async cancelScholarship(userId: string, legacyWpUserId: number | null) {
    return database.transaction(async (transaction) => {
      await database.query(
        `UPDATE usuarios_activaciones_becas child
         INNER JOIN usuarios_activaciones_becas sponsor
           ON sponsor.id=child.patrocinador_activacion_id
         SET child.vigente_hasta=DATE_SUB(CURDATE(),INTERVAL 1 DAY)
         WHERE sponsor.user_id=:userId`,
        { replacements: { userId }, type: QueryTypes.UPDATE, transaction },
      );
      const [, activationCount] = await database.query(
        `UPDATE usuarios_activaciones_becas
         SET vigente_hasta=DATE_SUB(CURDATE(),INTERVAL 1 DAY)
         WHERE user_id=:userId
           AND (vigente_hasta IS NULL OR vigente_hasta>=CURDATE())`,
        { replacements: { userId }, type: QueryTypes.UPDATE, transaction },
      );
      let membershipCount = 0;
      if (legacyWpUserId) {
        const [, updated] = await database.query(
          `UPDATE usuarios_membresias
           SET status='cancelled',enddate=NOW(),modified=NOW()
           WHERE user_id=:legacyWpUserId AND status='active'
             AND (enddate IS NULL OR enddate>=NOW())`,
          { replacements: { legacyWpUserId }, type: QueryTypes.UPDATE, transaction },
        );
        membershipCount = Number(updated);
      }
      await database.query(
        `UPDATE usuarios_cuentas
         SET scholarship_cancelled_at=NOW(),updated_at=NOW() WHERE id=:userId`,
        { replacements: { userId }, type: QueryTypes.UPDATE, transaction },
      );
      return {
        cancelled: true,
        activationsClosed: Number(activationCount),
        membershipsClosed: membershipCount,
      };
    });
  }

}
