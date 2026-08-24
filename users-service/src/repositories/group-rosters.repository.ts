import { QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';

export interface RosterRowInput {
  line: number;
  email: string;
  code: string;
  rfc: string;
  name: string;
  username: string;
}

export interface RosterImportInput {
  fileName: string;
  sheetName: string | null;
  levelId: number | null;
  starts: string | null;
  expires: string | null;
  syncCodes: boolean;
  rows: RosterRowInput[];
}

export interface CentralRowInput extends RosterRowInput {
  officialEmail: string;
}

type BulkAction = 'SUSPEND' | 'REACTIVATE' | 'SET_EXPIRY' | 'EXTEND_DAYS' | 'INDEFINITE';

const centralMatchSql = `(EXISTS(SELECT 1 FROM usuarios_base_central_filas central
    WHERE central.importacion_id=(SELECT id FROM usuarios_base_central_importaciones WHERE es_vigente=1 ORDER BY creado_en DESC,id DESC LIMIT 1)
      AND r.rfc<>'' AND central.rfc=r.rfc)
  OR EXISTS(SELECT 1 FROM usuarios_base_central_filas central
    WHERE central.importacion_id=(SELECT id FROM usuarios_base_central_importaciones WHERE es_vigente=1 ORDER BY creado_en DESC,id DESC LIMIT 1)
      AND r.correo<>'' AND central.correo=r.correo)
  OR EXISTS(SELECT 1 FROM usuarios_base_central_filas central
    WHERE central.importacion_id=(SELECT id FROM usuarios_base_central_importaciones WHERE es_vigente=1 ORDER BY creado_en DESC,id DESC LIMIT 1)
      AND r.correo<>'' AND central.correo_oficial=r.correo)
  OR EXISTS(SELECT 1 FROM usuarios_base_central_filas central
    WHERE central.importacion_id=(SELECT id FROM usuarios_base_central_importaciones WHERE es_vigente=1 ORDER BY creado_en DESC,id DESC LIMIT 1)
      AND r.codigo<>'' AND central.codigo=r.codigo))`;

// Keep roster reconciliation index-friendly. The previous joins used OR plus
// LOWER(TRIM(column)) inside a correlated subquery for every roster row. With
// large rosters that forced thousands of repeated table scans and exceeded the
// gateway timeout. Imports already normalize emails/RFCs, so direct equality
// preserves the intended priority while allowing MySQL to use existing indexes.
const rosterReconciliationJoinsSql = `
  LEFT JOIN usuarios_oficiales o ON o.id=COALESCE(
    (SELECT o2.id FROM usuarios_oficiales o2
      WHERE r.rfc<>'' AND o2.rfc=r.rfc COLLATE utf8mb4_unicode_520_ci
      ORDER BY o2.id LIMIT 1),
    (SELECT o2.id FROM usuarios_oficiales o2
      WHERE r.correo<>'' AND o2.correo=r.correo COLLATE utf8mb4_unicode_520_ci
      ORDER BY o2.id LIMIT 1))
  LEFT JOIN usuarios_cuentas c ON c.id=COALESCE(
    (SELECT c2.id FROM usuarios_cuentas c2
      WHERE o.wp_user_id IS NOT NULL AND c2.legacy_wp_user_id=o.wp_user_id
      ORDER BY c2.created_at DESC LIMIT 1),
    (SELECT c2.id FROM usuarios_cuentas c2
      WHERE r.correo<>'' AND c2.email=r.correo
      ORDER BY c2.created_at DESC LIMIT 1))
  LEFT JOIN usuarios_pendientes p ON p.id=COALESCE(
    (SELECT p2.id FROM usuarios_pendientes p2
      WHERE r.rfc<>'' AND p2.rfc=r.rfc COLLATE utf8mb4_unicode_520_ci
      ORDER BY p2.creado_en DESC LIMIT 1),
    (SELECT p2.id FROM usuarios_pendientes p2
      WHERE r.correo<>'' AND p2.correo=r.correo
      ORDER BY p2.creado_en DESC LIMIT 1))
  LEFT JOIN usuarios_codigos_beca_email code
    ON r.codigo<>'' AND code.code=r.codigo
  LEFT JOIN usuarios_activaciones_becas a ON a.id=COALESCE(
    (SELECT a2.id FROM usuarios_activaciones_becas a2
      WHERE a2.user_id=c.id AND r.codigo<>''
        AND a2.codigo=r.codigo
      ORDER BY a2.activado_en DESC LIMIT 1),
    (SELECT a2.id FROM usuarios_activaciones_becas a2
      WHERE a2.user_id=c.id AND r.codigo=''
      ORDER BY a2.activado_en DESC LIMIT 1))`;

const audit = async (
  transaction: Transaction,
  groupId: number,
  importId: number | null,
  action: string,
  affected: number,
  actorId: string | null,
  detail: Record<string, unknown>,
) => database.query(
  `INSERT INTO usuarios_padrones_grupos_historial
    (grupo_id,importacion_id,accion,afectados,realizado_por_user_id,detalle,creado_en)
   VALUES(:groupId,:importId,:action,:affected,:actorId,:detail,NOW())`,
  { replacements: { groupId, importId, action, affected, actorId, detail: JSON.stringify(detail) }, transaction },
);

class GroupRostersRepository {
  async importCentral(fileName: string, sheetName: string | null, rows: CentralRowInput[]) {
    return database.transaction(async (transaction) => {
      await database.query('UPDATE usuarios_base_central_importaciones SET es_vigente=0 WHERE es_vigente=1', { transaction });
      const [createdId] = await database.query(
        `INSERT INTO usuarios_base_central_importaciones
          (nombre_archivo,nombre_hoja,total_filas,es_vigente,creado_en)
         VALUES(:fileName,:sheetName,:total,1,NOW())`,
        { replacements: { fileName, sheetName, total: rows.length }, type: QueryTypes.INSERT, transaction },
      );
      const importId = Number(createdId);
      for (let offset = 0; offset < rows.length; offset += 500) {
        const chunk = rows.slice(offset, offset + 500);
        const replacements: Record<string, unknown> = { importId };
        const values = chunk.map((row, index) => {
          const key = `${offset}_${index}`;
          replacements[`line_${key}`] = row.line;
          replacements[`rfc_${key}`] = row.rfc;
          replacements[`name_${key}`] = row.name;
          replacements[`email_${key}`] = row.email;
          replacements[`official_${key}`] = row.officialEmail;
          replacements[`code_${key}`] = row.code;
          return `(:importId,:line_${key},:rfc_${key},:name_${key},:email_${key},:official_${key},:code_${key},NOW())`;
        });
        await database.query(
          `INSERT INTO usuarios_base_central_filas
            (importacion_id,numero_fila,rfc,nombre,correo,correo_oficial,codigo,creado_en)
           VALUES ${values.join(',')}`,
          { replacements, transaction },
        );
      }
      return { importId, total: rows.length, fileName, sheetName };
    });
  }

  async centralHistory() {
    return database.query(
      `SELECT id,nombre_archivo file_name,nombre_hoja sheet_name,total_filas total,
        es_vigente current,creado_en created_at
       FROM usuarios_base_central_importaciones ORDER BY creado_en DESC,id DESC LIMIT 20`,
      { type: QueryTypes.SELECT },
    );
  }

  async importRoster(groupId: number, input: RosterImportInput, actorId: string | null) {
    return database.transaction(async (transaction) => {
      const group = await database.query(
        `SELECT g.id,g.nombre FROM usuarios_padrones_esperados g
         WHERE g.id=:groupId AND g.activo=1 LIMIT 1 FOR UPDATE`,
        { replacements: { groupId }, type: QueryTypes.SELECT, plain: true, transaction },
      ) as { id: number; nombre: string } | null;
      if (!group) return null;

      await database.query(
        'UPDATE usuarios_padrones_grupos_importaciones SET es_vigente=0 WHERE grupo_id=:groupId AND es_vigente=1',
        { replacements: { groupId }, transaction },
      );
      const [createdId] = await database.query(
        `INSERT INTO usuarios_padrones_grupos_importaciones
          (grupo_id,nombre_archivo,nombre_hoja,nivel_membresia_id,vigente_desde,
           vigente_hasta,total_filas,es_vigente,importado_por_user_id,creado_en)
         VALUES(:groupId,:fileName,:sheetName,:levelId,:starts,:expires,:total,1,:actorId,NOW())`,
        { replacements: { groupId, ...input, total: input.rows.length, actorId }, type: QueryTypes.INSERT, transaction },
      );
      const importId = Number(createdId);
      for (let offset = 0; offset < input.rows.length; offset += 500) {
        const chunk = input.rows.slice(offset, offset + 500);
        const replacements: Record<string, unknown> = { importId, groupId };
        const values = chunk.map((row, index) => {
          const key = `${offset}_${index}`;
          replacements[`line_${key}`] = row.line;
          replacements[`email_${key}`] = row.email;
          replacements[`code_${key}`] = row.code;
          replacements[`rfc_${key}`] = row.rfc;
          replacements[`name_${key}`] = row.name;
          replacements[`username_${key}`] = row.username;
          return `(:importId,:groupId,:line_${key},:email_${key},:code_${key},:rfc_${key},:name_${key},:username_${key},NOW())`;
        });
        await database.query(
          `INSERT INTO usuarios_padrones_grupos_filas
            (importacion_id,grupo_id,numero_fila,correo,codigo,rfc,nombre,usuario,creado_en)
           VALUES ${values.join(',')}`,
          { replacements, transaction },
        );
      }

      if (input.syncCodes && input.levelId) {
        await database.query(
          `INSERT INTO usuarios_codigos_beca_email
            (code,allowed_email,nivel_membresia_id,vigente_desde,vigente_hasta,max_usos,
             usos_historicos,created_at,updated_at,estado,lote,notas)
           SELECT r.codigo,MIN(r.correo),:levelId,:starts,:expires,1,0,NOW(),NOW(),'ACTIVE',
             LEFT(:batch,120),CONCAT('Importado desde padrón de grupo #',:groupId)
           FROM usuarios_padrones_grupos_filas r
           WHERE r.importacion_id=:importId AND r.codigo<>'' AND r.correo<>''
           GROUP BY r.codigo
           ON DUPLICATE KEY UPDATE allowed_email=VALUES(allowed_email),
             nivel_membresia_id=VALUES(nivel_membresia_id),vigente_desde=VALUES(vigente_desde),
             vigente_hasta=VALUES(vigente_hasta),estado='ACTIVE',lote=VALUES(lote),
             notas=VALUES(notas),updated_at=NOW()`,
          {
            replacements: {
              importId, groupId, levelId: input.levelId, starts: input.starts,
              expires: input.expires, batch: group.nombre,
            },
            transaction,
          },
        );
      }
      await audit(transaction, groupId, importId, 'IMPORT', input.rows.length, actorId, {
        fileName: input.fileName, sheetName: input.sheetName, syncCodes: input.syncCodes,
      });
      return { importId, groupId, total: input.rows.length };
    });
  }

  async current(groupId: number, status = '', search = '') {
    const summary = await database.query(
      `SELECT i.*,g.nombre group_name,
        COUNT(r.id) total,
        SUM(c.id IS NOT NULL) registered,
        SUM(c.id IS NULL AND p.id IS NOT NULL) pending,
        SUM(c.id IS NULL AND p.id IS NULL) unregistered,
        SUM(code.id IS NOT NULL) codes_found,
        SUM(c.id IS NOT NULL AND a.id IS NULL) without_scholarship,
        SUM(a.id IS NOT NULL AND a.suspended_at IS NULL
          AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())) active_scholarships,
        SUM(a.suspended_at IS NOT NULL) suspended_scholarships,
        SUM(a.id IS NOT NULL AND a.suspended_at IS NULL
          AND a.vigente_hasta<CURDATE()) expired_scholarships,
        SUM(${centralMatchSql}) central_matched
       FROM usuarios_padrones_grupos_importaciones i
       INNER JOIN usuarios_padrones_esperados g ON g.id=i.grupo_id
       LEFT JOIN usuarios_padrones_grupos_filas r ON r.importacion_id=i.id
       ${rosterReconciliationJoinsSql}
       WHERE i.grupo_id=:groupId AND i.es_vigente=1 GROUP BY i.id,g.id LIMIT 1`,
      { replacements: { groupId }, type: QueryTypes.SELECT, plain: true },
    ) as Record<string, unknown> | null;
    if (!summary) return null;
    const clauses = ['r.importacion_id=:importId'];
    const replacements: Record<string, unknown> = { importId: summary.id, search: `%${search}%` };
    if (search) clauses.push('(r.correo LIKE :search OR r.codigo LIKE :search OR r.nombre LIKE :search OR r.rfc LIKE :search)');
    if (status === 'REGISTERED') clauses.push('c.id IS NOT NULL');
    if (status === 'PENDING') clauses.push('c.id IS NULL AND p.id IS NOT NULL');
    if (status === 'UNREGISTERED') clauses.push('c.id IS NULL AND p.id IS NULL');
    if (status === 'WITHOUT_SCHOLARSHIP') clauses.push('c.id IS NOT NULL AND a.id IS NULL');
    if (status === 'ACTIVE') clauses.push("a.id IS NOT NULL AND a.suspended_at IS NULL AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())");
    if (status === 'SUSPENDED') clauses.push('a.suspended_at IS NOT NULL');
    if (status === 'EXPIRED') clauses.push('a.id IS NOT NULL AND a.suspended_at IS NULL AND a.vigente_hasta<CURDATE()');
    if (status === 'CENTRAL') clauses.push(centralMatchSql);
    const rows = await database.query(
      `SELECT r.id,r.numero_fila,r.correo,r.codigo,r.rfc,r.nombre,r.usuario,
        c.id account_id,c.display_name account_name,c.username account_username,c.status account_status,
        p.estatus pending_status,code.id code_id,code.estado code_status,
        a.id activation_id,a.vigente_hasta scholarship_expires,a.suspended_at,
        n.name membership_name,
        ${centralMatchSql} central_match,
        CASE WHEN c.id IS NOT NULL THEN 'REGISTERED'
             WHEN p.id IS NOT NULL THEN 'PENDING' ELSE 'UNREGISTERED' END registration_status,
        CASE WHEN a.id IS NULL THEN 'WITHOUT_SCHOLARSHIP'
             WHEN a.suspended_at IS NOT NULL THEN 'SUSPENDED'
             WHEN a.vigente_hasta IS NOT NULL AND a.vigente_hasta<CURDATE() THEN 'EXPIRED'
             WHEN a.vigente_hasta IS NULL THEN 'INDEFINITE' ELSE 'ACTIVE' END scholarship_status
       FROM usuarios_padrones_grupos_filas r
       ${rosterReconciliationJoinsSql}
       LEFT JOIN usuarios_niveles_membresia n ON n.id=a.nivel_membresia_id
       WHERE ${clauses.join(' AND ')} ORDER BY r.numero_fila LIMIT 2000`,
      { replacements, type: QueryTypes.SELECT },
    );
    return { summary, rows, truncated: Number(summary.total) > 2000 };
  }

  async history(groupId: number) {
    const [imports, actions] = await Promise.all([
      database.query(
        `SELECT id,nombre_archivo,nombre_hoja,total_filas,es_vigente,nivel_membresia_id,
          vigente_desde,vigente_hasta,creado_en
         FROM usuarios_padrones_grupos_importaciones WHERE grupo_id=:groupId
         ORDER BY creado_en DESC LIMIT 30`,
        { replacements: { groupId }, type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT id,importacion_id,accion,afectados,detalle,creado_en
         FROM usuarios_padrones_grupos_historial WHERE grupo_id=:groupId
         ORDER BY creado_en DESC LIMIT 100`,
        { replacements: { groupId }, type: QueryTypes.SELECT },
      ),
    ]);
    return { imports, actions };
  }

  async restore(groupId: number, importId: number, actorId: string | null) {
    return database.transaction(async (transaction) => {
      const selected = await database.query(
        `SELECT id,total_filas,nombre_archivo FROM usuarios_padrones_grupos_importaciones
         WHERE id=:importId AND grupo_id=:groupId LIMIT 1 FOR UPDATE`,
        { replacements: { importId, groupId }, type: QueryTypes.SELECT, plain: true, transaction },
      ) as { id: number; total_filas: number; nombre_archivo: string } | null;
      if (!selected) return null;
      await database.query(
        'UPDATE usuarios_padrones_grupos_importaciones SET es_vigente=(id=:importId) WHERE grupo_id=:groupId',
        { replacements: { importId, groupId }, transaction },
      );
      await audit(transaction, groupId, importId, 'RESTORE_IMPORT', Number(selected.total_filas), actorId, {
        fileName: selected.nombre_archivo,
      });
      return { restored: true, importId, total: Number(selected.total_filas) };
    });
  }

  async bulkAction(
    groupId: number,
    action: BulkAction,
    actorId: string | null,
    endDate: string | null,
    days: number | null,
  ) {
    return database.transaction(async (transaction) => {
      const current = await database.query(
        `SELECT id FROM usuarios_padrones_grupos_importaciones
         WHERE grupo_id=:groupId AND es_vigente=1 ORDER BY creado_en DESC LIMIT 1 FOR UPDATE`,
        { replacements: { groupId }, type: QueryTypes.SELECT, plain: true, transaction },
      ) as { id: number } | null;
      if (!current) return null;
      const activations = await database.query(
        `SELECT DISTINCT a.id,a.user_id,a.nivel_membresia_id,u.legacy_wp_user_id
         FROM usuarios_padrones_grupos_filas r
         INNER JOIN usuarios_cuentas u ON LOWER(TRIM(u.email)) COLLATE utf8mb4_unicode_ci=r.correo COLLATE utf8mb4_unicode_ci
         INNER JOIN usuarios_activaciones_becas a ON a.user_id=u.id
           AND (r.codigo='' OR a.codigo COLLATE utf8mb4_unicode_ci=r.codigo COLLATE utf8mb4_unicode_ci)
         WHERE r.importacion_id=:importId FOR UPDATE`,
        { replacements: { importId: current.id }, type: QueryTypes.SELECT, transaction },
      ) as Array<{ id: string; user_id: string; nivel_membresia_id: number; legacy_wp_user_id: number | null }>;
      const ids = activations.map((row) => row.id);
      if (ids.length) {
        if (action === 'SUSPEND' || action === 'REACTIVATE') {
          const suspended = action === 'SUSPEND';
          await database.query(
            `UPDATE usuarios_activaciones_becas SET suspended_at=${suspended ? 'NOW()' : 'NULL'} WHERE id IN (:ids)`,
            { replacements: { ids }, transaction },
          );
          await database.query(
            `UPDATE usuarios_cuentas SET scholarship_cancelled_at=${suspended ? 'NOW()' : 'NULL'},updated_at=NOW()
             WHERE id IN (:userIds)`,
            { replacements: { userIds: [...new Set(activations.map((row) => row.user_id))] }, transaction },
          );
          await database.query(
            `UPDATE usuarios_membresias m
             INNER JOIN usuarios_cuentas u ON u.legacy_wp_user_id=m.user_id
             INNER JOIN usuarios_activaciones_becas a ON a.user_id=u.id
               AND a.nivel_membresia_id=m.membership_id
             SET m.status=:membershipStatus,m.modified=NOW()
             WHERE a.id IN (:ids)`,
            {
              replacements: {
                membershipStatus: suspended ? 'cancelled' : 'active',
                ids,
              },
              transaction,
            },
          );
        } else {
          const expirySql = action === 'INDEFINITE' ? 'NULL'
            : action === 'EXTEND_DAYS'
              ? 'DATE_ADD(COALESCE(GREATEST(vigente_hasta,CURDATE()),CURDATE()),INTERVAL :days DAY)'
              : ':endDate';
          await database.query(
            `UPDATE usuarios_activaciones_becas SET vigente_hasta=${expirySql} WHERE id IN (:ids)`,
            { replacements: { ids, days, endDate }, transaction },
          );
          await database.query(
            `UPDATE usuarios_codigos_beca_email c
             INNER JOIN usuarios_padrones_grupos_filas r ON r.codigo COLLATE utf8mb4_unicode_ci=c.code COLLATE utf8mb4_unicode_ci
             SET c.vigente_hasta=${action === 'INDEFINITE' ? 'NULL' : action === 'EXTEND_DAYS' ? 'DATE_ADD(COALESCE(GREATEST(c.vigente_hasta,CURDATE()),CURDATE()),INTERVAL :days DAY)' : ':endDate'},c.updated_at=NOW()
             WHERE r.importacion_id=:importId`,
            { replacements: { importId: current.id, days, endDate }, transaction },
          );
          await database.query(
            `UPDATE usuarios_membresias m
             INNER JOIN usuarios_cuentas u ON u.legacy_wp_user_id=m.user_id
             INNER JOIN usuarios_activaciones_becas a ON a.user_id=u.id AND a.nivel_membresia_id=m.membership_id
             SET m.enddate=CASE WHEN a.vigente_hasta IS NULL THEN NULL ELSE CONCAT(a.vigente_hasta,' 23:59:59') END,
                 m.modified=NOW()
             WHERE a.id IN (:ids)`,
            { replacements: { ids }, transaction },
          );
        }
      }
      await audit(transaction, groupId, current.id, action, ids.length, actorId, { endDate, days });
      return { action, affected: ids.length, importId: current.id };
    });
  }
}

export default new GroupRostersRepository();
