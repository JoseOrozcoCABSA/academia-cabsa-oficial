import { QueryTypes } from 'sequelize';
import { randomUUID } from 'node:crypto';
import database from '#config/database';

class UserDashboardRepository {
  async membershipLevelExists(levelId: number) {
    const rows = await database.query<{ found: number }>(
      'SELECT 1 found FROM usuarios_niveles_membresia WHERE id=:levelId LIMIT 1',
      { replacements: { levelId }, type: QueryTypes.SELECT },
    );
    return Boolean(rows[0]?.found);
  }

  async accessMatrix() {
    return database.query(
      `SELECT a.nivel_membresia_id level_id,
              COALESCE(n.name,CONCAT('Beca #',a.nivel_membresia_id)) level_name,
              a.seccion_codigo section_code,a.seccion_nombre section_name,
              a.descripcion,a.permitido allowed,a.actualizado_en updated_at
       FROM usuarios_accesos_beca_paginas a
       LEFT JOIN usuarios_niveles_membresia n ON n.id=a.nivel_membresia_id
       ORDER BY n.name,a.nivel_membresia_id,a.id`,
      { type: QueryTypes.SELECT },
    );
  }

  async updateAccess(levelId: number, sectionCode: string, allowed: boolean, actorId: string | null) {
    const [, count] = await database.query(
      `UPDATE usuarios_accesos_beca_paginas
       SET permitido=:allowed,actualizado_por_user_id=:actorId,actualizado_en=NOW()
       WHERE nivel_membresia_id=:levelId AND seccion_codigo=:sectionCode`,
      { replacements: { levelId, sectionCode, allowed: allowed ? 1 : 0, actorId }, type: QueryTypes.UPDATE },
    );
    return Number(count);
  }

  async resourceAccessRules() {
    return database.query(
      `SELECT nivel_membresia_id level_id,tipo_recurso resource_type,
              clave_recurso resource_key,permitido allowed,actualizado_en updated_at
       FROM usuarios_accesos_beca_recursos
       ORDER BY tipo_recurso,clave_recurso,nivel_membresia_id`,
      { type: QueryTypes.SELECT },
    );
  }

  async updateResourceAccess(levelId: number, resourceType: string, resourceKey: string, allowed: boolean, actorId: string | null) {
    await database.query(
      `INSERT INTO usuarios_accesos_beca_recursos
        (nivel_membresia_id,tipo_recurso,clave_recurso,permitido,actualizado_por_user_id,creado_en,actualizado_en)
       VALUES(:levelId,:resourceType,:resourceKey,:allowed,:actorId,NOW(),NOW())
       ON DUPLICATE KEY UPDATE permitido=VALUES(permitido),
         actualizado_por_user_id=VALUES(actualizado_por_user_id),actualizado_en=NOW()`,
      { replacements: { levelId, resourceType, resourceKey, allowed: allowed ? 1 : 0, actorId } },
    );
    return { levelId, resourceType, resourceKey, allowed };
  }

  async overview() {
    const [accounts, users, pending, groups, flow] = await Promise.all([
      database.query(
        `SELECT
          c.id,c.id account_id,o.id official_id,c.legacy_wp_user_id wp_user_id,
          c.username usuario,c.email correo,c.display_name nombre_visible,
          COALESCE(c.first_name,'') nombre,COALESCE(c.last_name,'') apellidos,
          COALESCE(c.phone,'') telefono,
          COALESCE(v.rfc,'') rfc,
          CASE c.status WHEN 'ACTIVE' THEN 'activo' WHEN 'PENDING' THEN 'pendiente'
            WHEN 'SUSPENDED' THEN 'suspendido' ELSE 'inactivo' END estado_cuenta,
          c.status modern_status,c.created_at fecha_registro,c.last_login_at modern_last_login,
          COALESCE(v.estado_oficial,'') estado_oficial,
          COALESCE(v.municipio_oficial,'') municipio_oficial,
          COALESCE(v.codigo_postal,'') codigo_postal,COALESCE(v.colonia,'') colonia,
          COALESCE(v.region_administrativa,'') region_administrativa,
          COALESCE(v.coordinador,'') coordinador,
          COALESCE(v.estatus_geografico,'pendiente') estatus_geografico,
          CASE WHEN o.id IS NULL THEN 'cuenta_nueva' ELSE COALESCE(v.estatus_identidad,'correcto') END estatus_identidad,
          COALESCE(v.observaciones_calidad,'') observaciones_calidad,
          COALESCE(v.total_inicios_sesion,0) total_inicios_sesion,
          COALESCE(v.grupos,'') grupos,COALESCE(v.total_grupos,0) total_grupos,
          (SELECT a.nivel_membresia_id FROM usuarios_activaciones_becas a
           WHERE a.user_id=c.id AND a.suspended_at IS NULL
             AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())
           ORDER BY a.activado_en DESC LIMIT 1) nivel_membresia_id,
          CASE WHEN COALESCE(v.membresia_activa,0)>0 OR EXISTS(
            SELECT 1 FROM usuarios_activaciones_becas a
            WHERE a.user_id=c.id AND a.suspended_at IS NULL AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())
          ) THEN 1 ELSE 0 END membresia_activa,
          COALESCE((
            SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.name SEPARATOR ', ')
            FROM usuarios_activaciones_becas a
            LEFT JOIN usuarios_niveles_membresia n ON n.id=a.nivel_membresia_id
            WHERE a.user_id=c.id AND a.suspended_at IS NULL AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())
          ),v.membresias,'') membresias,
          COALESCE(v.fecha_limite_membresia,(
            SELECT MAX(a.vigente_hasta) FROM usuarios_activaciones_becas a WHERE a.user_id=c.id
          )) fecha_limite_membresia,
          CASE WHEN o.id IS NULL THEN 'cuenta_plataforma' ELSE 'cuenta_vinculada' END tipo_registro,
          (SELECT GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ', ')
           FROM usuarios_asignaciones_roles ur
           INNER JOIN usuarios_roles r ON r.id=ur.role_id WHERE ur.user_id=c.id) roles
         FROM usuarios_cuentas c
         LEFT JOIN usuarios_oficiales o ON o.wp_user_id=c.legacy_wp_user_id
         LEFT JOIN usuarios_vista_administracion v ON v.wp_user_id=c.legacy_wp_user_id
         ORDER BY c.created_at DESC,c.display_name,c.username`,
        { type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT v.*,c.id account_id,c.status modern_status,c.last_login_at modern_last_login
         FROM usuarios_vista_administracion v
         LEFT JOIN usuarios_cuentas c ON c.legacy_wp_user_id=v.wp_user_id
         ORDER BY v.nombre_visible,v.usuario`,
        { type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT -p.id id,p.id pending_id,p.signup_id,p.wp_user_id,p.usuario,p.correo,
          COALESCE(NULLIF(p.usuario,''),p.correo) nombre_visible,'' nombre,'' apellidos,p.rfc,
          p.estatus estado_cuenta,p.creado_en fecha_registro,p.estado estado_oficial,
          p.clave_estado,p.municipio municipio_oficial,p.clave_municipio,
          p.codigo_postal,p.colonia,p.tipo_asentamiento,p.zona,
          p.region_nombre region_administrativa,p.coordinador,
          CASE WHEN p.estado<>'' AND p.municipio<>'' THEN 'completo'
               WHEN p.estado<>'' OR p.municipio<>'' THEN 'parcial' ELSE 'pendiente' END estatus_geografico,
          CASE WHEN p.correo<>'' AND p.rfc<>'' THEN 'correcto' ELSE 'incompleto' END estatus_identidad,
          p.validacion_mensaje observaciones_calidad,NULL ultimo_login,0 total_inicios_sesion,
          '' grupos,0 total_grupos,0 membresia_activa,'' membresias,NULL fecha_limite_membresia,
          'pendiente' tipo_registro
         FROM usuarios_pendientes p ORDER BY p.creado_en DESC`,
        { type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT g.*,0 miembros,COALESCE(p.padron_total,0) padron_total
         FROM usuarios_padrones_esperados g
         LEFT JOIN (
           SELECT i.grupo_id,COUNT(r.id) padron_total
           FROM usuarios_padrones_grupos_importaciones i
           LEFT JOIN usuarios_padrones_grupos_filas r ON r.importacion_id=i.id
           WHERE i.es_vigente=1 GROUP BY i.grupo_id
         ) p ON p.grupo_id=g.id
         WHERE g.activo=1
         GROUP BY g.id,p.padron_total
         ORDER BY padron_total DESC,g.nombre`,
        { type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT
          (SELECT COUNT(*) FROM usuarios_pendientes) solicitudes,
          (SELECT COUNT(*) FROM usuarios_pendientes WHERE estatus='pendiente') pendientes,
          (SELECT COUNT(*) FROM usuarios_pendientes WHERE estatus='activado') solicitudes_activadas,
          (SELECT COUNT(*) FROM usuarios_pendientes WHERE estatus<>'activado') solicitudes_sin_activar,
          (SELECT COUNT(*) FROM usuarios_cuentas) cuentas_plataforma,
          (SELECT COUNT(*) FROM usuarios_cuentas WHERE legacy_wp_user_id IS NULL) cuentas_sin_perfil,
          (SELECT COUNT(*) FROM usuarios_cuentas WHERE status='PENDING') cuentas_por_verificar,
          (SELECT COUNT(*) FROM usuarios_oficiales) perfiles_oficiales,
          (SELECT COUNT(*) FROM usuarios_miembros_grupos) relaciones_grupo,
          (SELECT COUNT(*) FROM usuarios_oficiales WHERE estatus_identidad='duplicado_probable') alertas_identidad`,
        { type: QueryTypes.SELECT, plain: true },
      ),
    ]);
    return { accounts, users, pending, groups, flow, generatedAt: new Date().toISOString() };
  }

  async groupAnalytics() {
    type MatchRow = { grupo_id?: number; rfc?: string; correo?: string; correo_oficial?: string; codigo?: string };
    const [roster, accounts, linkedProfiles, pending, central] = await Promise.all([
      database.query(
        `SELECT r.grupo_id,r.rfc,r.correo,r.codigo
         FROM usuarios_padrones_grupos_importaciones i
         INNER JOIN usuarios_padrones_grupos_filas r ON r.importacion_id=i.id
         WHERE i.es_vigente=1`,
        { type: QueryTypes.SELECT },
      ) as Promise<MatchRow[]>,
      database.query('SELECT email correo FROM usuarios_cuentas', { type: QueryTypes.SELECT }) as Promise<MatchRow[]>,
      database.query(
        `SELECT o.rfc,o.correo FROM usuarios_oficiales o
         INNER JOIN usuarios_cuentas c ON c.legacy_wp_user_id=o.wp_user_id`,
        { type: QueryTypes.SELECT },
      ) as Promise<MatchRow[]>,
      database.query('SELECT rfc,correo FROM usuarios_pendientes', { type: QueryTypes.SELECT }) as Promise<MatchRow[]>,
      database.query(
        `SELECT rfc,correo,correo_oficial,codigo FROM usuarios_base_central_filas
         WHERE importacion_id=(SELECT id FROM usuarios_base_central_importaciones
           WHERE es_vigente=1 ORDER BY creado_en DESC,id DESC LIMIT 1)`,
        { type: QueryTypes.SELECT },
      ) as Promise<MatchRow[]>,
    ]);
    const normalized = (value: unknown) => String(value ?? '').trim().toLowerCase();
    const values = (rows: MatchRow[], field: keyof MatchRow) => new Set(rows.map((row) => normalized(row[field])).filter(Boolean));
    const registeredEmails = values(accounts, 'correo');
    const linkedEmails = values(linkedProfiles, 'correo');
    const linkedRfcs = values(linkedProfiles, 'rfc');
    const pendingEmails = values(pending, 'correo');
    const pendingRfcs = values(pending, 'rfc');
    const centralEmails = new Set([...values(central, 'correo'), ...values(central, 'correo_oficial')]);
    const centralRfcs = values(central, 'rfc');
    const centralCodes = values(central, 'codigo');
    const result = new Map<number, { grupo_id: number; padron_total: number; padron_registrados: number; padron_pendientes: number; padron_no_registrados: number; padron_base_central: number }>();
    roster.forEach((row) => {
      const groupId = Number(row.grupo_id);
      const stats = result.get(groupId) || { grupo_id: groupId, padron_total: 0, padron_registrados: 0, padron_pendientes: 0, padron_no_registrados: 0, padron_base_central: 0 };
      const email = normalized(row.correo), rfc = normalized(row.rfc), code = normalized(row.codigo);
      const registered = Boolean((email && (registeredEmails.has(email) || linkedEmails.has(email))) || (rfc && linkedRfcs.has(rfc)));
      const waiting = !registered && Boolean((email && pendingEmails.has(email)) || (rfc && pendingRfcs.has(rfc)));
      stats.padron_total += 1;
      if (registered) stats.padron_registrados += 1;
      else if (waiting) stats.padron_pendientes += 1;
      else stats.padron_no_registrados += 1;
      if ((email && centralEmails.has(email)) || (rfc && centralRfcs.has(rfc)) || (code && centralCodes.has(code))) stats.padron_base_central += 1;
      result.set(groupId, stats);
    });
    return [...result.values()];
  }

  async updateAccount(id: string, values: Record<string, unknown>) {
    return database.transaction(async (transaction) => {
      const current = await database.query(
        'SELECT * FROM usuarios_cuentas WHERE id=:id FOR UPDATE',
        { replacements: { id }, type: QueryTypes.SELECT, plain: true, transaction },
      ) as Record<string, unknown> | null;
      if (!current) return null;
      const next = {
        id,
        email: values.email ?? current.email,
        username: values.username ?? current.username,
        displayName: values.displayName ?? current.display_name,
        firstName: values.firstName ?? current.first_name,
        lastName: values.lastName ?? current.last_name,
        phone: values.phone ?? current.phone,
        status: values.status ?? current.status,
        passwordHash: values.passwordHash || null,
      };
      await database.query(
        `UPDATE usuarios_cuentas SET email=:email,username=:username,
         display_name=:displayName,first_name=:firstName,last_name=:lastName,phone=:phone,
         status=:status,password_hash=COALESCE(:passwordHash,password_hash),updated_at=NOW()
         WHERE id=:id`,
        { replacements: next, transaction },
      );
      const scholarshipLevel = Number(values.scholarshipLevel || 0);
      if (scholarshipLevel) {
        const [, changed] = await database.query(
          `UPDATE usuarios_activaciones_becas SET nivel_membresia_id=:scholarshipLevel
           WHERE user_id=:id AND suspended_at IS NULL
             AND (vigente_hasta IS NULL OR vigente_hasta>=CURDATE())`,
          { replacements: { id, scholarshipLevel }, type: QueryTypes.UPDATE, transaction },
        );
        if (Number(changed)) {
          await database.query(
            `UPDATE usuarios_codigos_beca_email code
             INNER JOIN usuarios_activaciones_becas activation ON activation.codigo=code.code
             SET code.nivel_membresia_id=:scholarshipLevel,code.updated_at=NOW()
             WHERE activation.user_id=:id AND activation.suspended_at IS NULL
               AND (activation.vigente_hasta IS NULL OR activation.vigente_hasta>=CURDATE())`,
            { replacements: { id, scholarshipLevel }, transaction },
          );
        }
        if (!Number(changed)) {
          const activationId = randomUUID();
          const code = `ADMIN-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
          await database.query(
            `INSERT INTO usuarios_codigos_beca_email
              (code,allowed_email,nivel_membresia_id,vigente_desde,max_usos,usos_historicos,
               usado_por_user_id,usado_en,created_at,updated_at,estado,lote,notas)
             VALUES(:code,:email,:scholarshipLevel,CURDATE(),1,1,:id,NOW(),NOW(),NOW(),'ACTIVE',
               'ADMIN-MIEMBROS','Asignación desde el panel de miembros')`,
            { replacements: { code, email: next.email, scholarshipLevel, id }, transaction },
          );
          await database.query(
            `INSERT INTO usuarios_activaciones_becas
              (id,user_id,codigo,nivel_membresia_id,activado_en)
             VALUES(:activationId,:id,:code,:scholarshipLevel,NOW())`,
            { replacements: { activationId, id, code, scholarshipLevel }, transaction },
          );
        }
      }
      return { ...next, passwordHash: undefined, scholarshipLevel: scholarshipLevel || null };
    });
  }

  async updateOfficial(id: number, values: Record<string, unknown>) {
    return database.transaction(async (transaction) => {
      const current = await database.query(
        'SELECT * FROM usuarios_oficiales WHERE id=:id',
        { replacements: { id }, type: QueryTypes.SELECT, plain: true, transaction },
      ) as Record<string, unknown> | null;
      if (!current) return null;
      const next = {
        id,
        email: values.email ?? current.correo,
        displayName: values.displayName ?? current.nombre_visible,
        firstName: values.firstName ?? current.nombre,
        lastName: values.lastName ?? current.apellidos,
        rfc: values.rfc ?? current.rfc,
        region: values.region ?? current.region_administrativa,
        coordinator: values.coordinator ?? current.coordinador,
        municipality: values.municipality ?? current.municipio_capturado,
        state: values.state ?? current.estado_oficial,
        stateCode: values.stateCode ?? current.clave_estado,
        municipalityCode: values.municipalityCode ?? current.clave_municipio,
        postalCode: values.postalCode ?? current.codigo_postal,
        neighborhood: values.neighborhood ?? current.colonia,
        accountStatus: values.accountStatus ?? current.estado_cuenta,
        wpUserId: current.wp_user_id,
      };
      const geography = next.state && next.municipality ? 'completo'
        : next.state || next.municipality ? 'parcial' : 'pendiente';
      const identity = next.email && next.rfc ? 'correcto' : 'incompleto';
      await database.query(
        `UPDATE usuarios_oficiales SET correo=:email,nombre_visible=:displayName,
         nombre=:firstName,apellidos=:lastName,rfc=:rfc,region_administrativa=:region,
         coordinador=:coordinator,municipio_capturado=:municipality,
         estado_oficial=:state,clave_estado=:stateCode,municipio_oficial=:municipality,
         clave_municipio=:municipalityCode,codigo_postal=:postalCode,colonia=:neighborhood,
         estado_cuenta=:accountStatus,estatus_geografico=:geography,
         estatus_identidad=:identity,actualizado_en=NOW() WHERE id=:id`,
        { replacements: { ...next, geography, identity }, transaction },
      );
      await database.query(
        `UPDATE usuarios_cuentas SET email=:email,display_name=:displayName,
         first_name=:firstName,last_name=:lastName,
         status=:modernStatus,
         updated_at=NOW() WHERE legacy_wp_user_id=:wpUserId`,
        { replacements: { ...next, modernStatus: next.accountStatus === 'activo' ? 'ACTIVE' : 'SUSPENDED' }, transaction },
      );
      return next;
    });
  }

  async createGroup(values: { name: string; description: string; actorId: string | null }) {
    const [id] = await database.query(
      `INSERT INTO usuarios_padrones_esperados
        (nombre,descripcion,creado_por_user_id,creado_en,actualizado_en)
       VALUES(:name,:description,:actorId,NOW(),NOW())`,
      { replacements: values, type: QueryTypes.INSERT },
    );
    return { id, ...values };
  }

  async updateGroup(id: number, values: Record<string, unknown>) {
    const [, count] = await database.query(
      `UPDATE usuarios_padrones_esperados SET nombre=COALESCE(:name,nombre),
       descripcion=COALESCE(:description,descripcion),estado=COALESCE(:state,estado),
       clave_estado=COALESCE(:stateCode,clave_estado),municipio=COALESCE(:municipality,municipio),
       clave_municipio=COALESCE(:municipalityCode,clave_municipio),actualizado_en=NOW()
       WHERE id=:id AND activo=1`,
      { replacements: { id, ...values }, type: QueryTypes.UPDATE },
    );
    return count;
  }

  async removeGroup(id: number) {
    const members = await database.query(
      `SELECT
        0 members,
        (SELECT COUNT(*) FROM usuarios_padrones_grupos_importaciones WHERE grupo_id=:id) rosters`,
      { replacements: { id }, type: QueryTypes.SELECT, plain: true },
    ) as { members: number; rosters: number } | null;
    if (Number(members?.members) || Number(members?.rosters)) {
      return { blocked: true, members: Number(members?.members), rosters: Number(members?.rosters) };
    }
    const result = await database.query(
      'DELETE FROM usuarios_padrones_esperados WHERE id=:id',
      { replacements: { id }, type: QueryTypes.BULKDELETE },
    );
    return { blocked: false, deleted: Number(result), members: 0, rosters: 0 };
  }

  async assignGroup(officialId: number, groupId: number) {
    return database.transaction(async (transaction) => {
      const user = await database.query(
        `SELECT o.id,o.wp_user_id,c.id account_id FROM usuarios_oficiales o
         LEFT JOIN usuarios_cuentas c ON c.legacy_wp_user_id=o.wp_user_id WHERE o.id=:officialId`,
        { replacements: { officialId }, type: QueryTypes.SELECT, plain: true, transaction },
      ) as { id: number; wp_user_id: number; account_id: string | null } | null;
      if (!user) return null;
      await database.query(
        `INSERT INTO usuarios_miembros_grupos(grupo_id,usuario_oficial_id,wp_user_id,agregado_en)
         VALUES(:groupId,:officialId,:wpUserId,NOW())
         ON DUPLICATE KEY UPDATE agregado_en=VALUES(agregado_en)`,
        { replacements: { groupId, officialId, wpUserId: user.wp_user_id }, transaction },
      );
      if (user.account_id) {
        await database.query(
          `INSERT INTO usuarios_grupos_cuentas
           (grupo_id,user_id,creado_por_user_id,estado,agregado_en,actualizado_en)
           VALUES(:groupId,:userId,:userId,'ACTIVE',NOW(),NOW())
           ON DUPLICATE KEY UPDATE estado='ACTIVE',actualizado_en=NOW()`,
          { replacements: { groupId, userId: user.account_id }, transaction },
        );
      }
      return { assigned: true };
    });
  }

  async removeFromGroup(officialId: number, groupId: number) {
    return database.transaction(async (transaction) => {
      const user = await database.query(
        `SELECT c.id account_id FROM usuarios_oficiales o
         LEFT JOIN usuarios_cuentas c ON c.legacy_wp_user_id=o.wp_user_id WHERE o.id=:officialId`,
        { replacements: { officialId }, type: QueryTypes.SELECT, plain: true, transaction },
      ) as { account_id: string | null } | null;
      await database.query(
        'DELETE FROM usuarios_miembros_grupos WHERE grupo_id=:groupId AND usuario_oficial_id=:officialId',
        { replacements: { groupId, officialId }, transaction },
      );
      if (user?.account_id) {
        await database.query(
          `UPDATE usuarios_grupos_cuentas SET estado='REMOVED',actualizado_en=NOW()
           WHERE grupo_id=:groupId AND user_id=:userId`,
          { replacements: { groupId, userId: user.account_id }, transaction },
        );
      }
      return { removed: true };
    });
  }
}

export default new UserDashboardRepository();
