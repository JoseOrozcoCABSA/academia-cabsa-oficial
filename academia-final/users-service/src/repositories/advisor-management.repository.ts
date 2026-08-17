import { randomUUID } from 'node:crypto';
import { QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';

export type ActivationMode = 'DIRECT' | 'CODE';

export interface ManagedUserValues {
  advisorId: string;
  actorId: string;
  groupId: number;
  fullName: string;
  firstName: string;
  lastName: string | null;
  email: string;
  username: string;
  passwordHash: string;
  scholarshipLevel: number;
  expiresAt: string | null;
  activationMode: ActivationMode;
}

class AdvisorManagementRepository {
  roles(userId: string) {
    return database.query<{ code: string; email: string; username: string; displayName: string; firstName: string; lastName: string | null }>(
      `SELECT r.code FROM usuarios_asignaciones_roles ur
       INNER JOIN usuarios_roles r ON r.id=ur.role_id WHERE ur.user_id=:userId`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
  }

  listAdvisors() {
    return database.query(
      `SELECT c.id,c.email,c.username,c.display_name displayName,c.status,c.created_at createdAt,
        COUNT(DISTINCT ag.grupo_id) groupCount,COUNT(DISTINCT au.user_id) userCount,
        GROUP_CONCAT(DISTINCT g.nombre ORDER BY g.nombre SEPARATOR ', ') groupNames
       FROM usuarios_cuentas c
       INNER JOIN usuarios_asignaciones_roles ur ON ur.user_id=c.id
       INNER JOIN usuarios_roles r ON r.id=ur.role_id AND r.code='ADVISOR'
       LEFT JOIN usuarios_asesores_grupos ag ON ag.advisor_user_id=c.id
       LEFT JOIN usuarios_grupos g ON g.id=ag.grupo_id
       LEFT JOIN usuarios_asesores_usuarios au ON au.advisor_user_id=c.id
       GROUP BY c.id,c.email,c.username,c.display_name,c.status,c.created_at
       ORDER BY c.created_at DESC`,
      { type: QueryTypes.SELECT },
    );
  }

  async createAdvisor(values: { id: string; email: string; username: string; passwordHash: string; fullName: string; firstName: string; lastName: string | null; actorId: string }) {
    return database.transaction(async (transaction) => {
      const duplicates = await database.query<{ id: string }>(
        'SELECT id FROM usuarios_cuentas WHERE email=:email OR username=:username LIMIT 1 FOR UPDATE',
        { replacements: { ...values }, type: QueryTypes.SELECT, transaction },
      );
      if (duplicates[0]) return null;
      await database.query(
        `INSERT INTO usuarios_cuentas
         (id,email,username,password_hash,first_name,last_name,display_name,status,email_verified_at,created_at,updated_at)
         VALUES(:id,:email,:username,:passwordHash,:firstName,:lastName,:fullName,'ACTIVE',NOW(),NOW(),NOW())`,
        { replacements: values, type: QueryTypes.INSERT, transaction },
      );
      await database.query(
        `INSERT INTO usuarios_asignaciones_roles(user_id,role_id,assigned_by,created_at,updated_at)
         SELECT :id,id,:actorId,NOW(),NOW() FROM usuarios_roles WHERE code='ADVISOR' LIMIT 1`,
        { replacements: values, type: QueryTypes.INSERT, transaction },
      );
      return { id: values.id, email: values.email, username: values.username, displayName: values.fullName, status: 'ACTIVE' };
    });
  }

  async updateAdvisor(values: { id: string; email: string; username: string; fullName: string; firstName: string; lastName: string | null; actorId: string }) {
    return database.transaction(async (transaction) => {
      const duplicates = await database.query<{ id: string }>(
        'SELECT id FROM usuarios_cuentas WHERE (email=:email OR username=:username) AND id!=:id LIMIT 1 FOR UPDATE',
        { replacements: { ...values }, type: QueryTypes.SELECT, transaction },
      );
      if (duplicates[0]) return null;
      
      await database.query(
        `UPDATE usuarios_cuentas
         SET email=:email,username=:username,first_name=:firstName,last_name=:lastName,display_name=:fullName,updated_at=NOW()
         WHERE id=:id`,
        { replacements: values, type: QueryTypes.UPDATE, transaction },
      );
      
      return { id: values.id, email: values.email, username: values.username, displayName: values.fullName, status: 'ACTIVE' };
    });
  }

  async setAdvisorStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    const [, affected] = await database.query(
      `UPDATE usuarios_cuentas c SET status=:status,updated_at=NOW()
       WHERE c.id=:id AND EXISTS(SELECT 1 FROM usuarios_asignaciones_roles ur
         INNER JOIN usuarios_roles r ON r.id=ur.role_id WHERE ur.user_id=c.id AND r.code='ADVISOR')`,
      { replacements: { id, status }, type: QueryTypes.UPDATE },
    );
    return Number(affected);
  }

  async workspace(advisorId: string | null) {
    const filter = advisorId ? 'WHERE ag.advisor_user_id=:advisorId' : '';
    const [groups, users, scholarshipLevels] = await Promise.all([
      database.query(
        `SELECT g.id,g.nombre name,g.descripcion description,ag.advisor_user_id advisorId,
          c.display_name advisorName,COUNT(DISTINCT au.user_id) userCount
         FROM usuarios_asesores_grupos ag INNER JOIN usuarios_grupos g ON g.id=ag.grupo_id
         INNER JOIN usuarios_cuentas c ON c.id=ag.advisor_user_id
         LEFT JOIN usuarios_asesores_usuarios au ON au.grupo_id=g.id AND au.advisor_user_id=ag.advisor_user_id
         ${filter} GROUP BY g.id,g.nombre,g.descripcion,ag.advisor_user_id,c.display_name ORDER BY g.nombre`,
        { replacements: { advisorId }, type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT au.advisor_user_id advisorId,au.grupo_id groupId,g.nombre groupName,au.user_id id,
          c.display_name displayName,c.email,c.username,c.status,
          au.nivel_membresia_id scholarshipLevel,au.activation_mode activationMode,
          n.name scholarshipName,code.code,code.vigente_hasta expiresAt,
          CASE WHEN a.id IS NULL THEN 0 ELSE 1 END scholarshipActive,au.created_at createdAt
         FROM usuarios_asesores_usuarios au INNER JOIN usuarios_cuentas c ON c.id=au.user_id
         INNER JOIN usuarios_grupos g ON g.id=au.grupo_id
         LEFT JOIN usuarios_niveles_membresia n ON n.id=au.nivel_membresia_id
         LEFT JOIN usuarios_codigos_beca_email code ON code.code=au.scholarship_code
         LEFT JOIN usuarios_activaciones_becas a ON a.user_id=au.user_id AND a.codigo=au.scholarship_code AND a.suspended_at IS NULL
         ${advisorId ? 'WHERE au.advisor_user_id=:advisorId' : ''}
         ORDER BY au.created_at DESC`,
        { replacements: { advisorId }, type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT id,name,description,expiration_number expirationNumber,
          expiration_period expirationPeriod,allow_signups allowSignups
         FROM usuarios_niveles_membresia ORDER BY name,id`,
        { type: QueryTypes.SELECT },
      ),
    ]);
    return { groups, users, scholarshipLevels };
  }

  async scholarshipLevelExists(levelId: number) {
    const rows = await database.query<{ found: number }>(
      'SELECT 1 found FROM usuarios_niveles_membresia WHERE id=:levelId LIMIT 1',
      { replacements: { levelId }, type: QueryTypes.SELECT },
    );
    return Boolean(rows[0]);
  }

  /**
   * Get user data for profile purposes.
   */
  async userData(userId: string) {
    const user = await database.query<{
      email: string;
      username: string;
      display_name: string;
      first_name: string;
      last_name: string;
    }>(
      `SELECT email, username, display_name, first_name, last_name 
       FROM usuarios_cuentas 
       WHERE id = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      }
    );
    return user[0] || null;
  }

  async createGroup(advisorId: string, actorId: string, name: string, description: string) {
    return database.transaction(async (transaction) => {
      const [groupId] = await database.query(
        `INSERT INTO usuarios_grupos(nombre,descripcion,creado_por_wp_user_id,creado_en,actualizado_en)
         VALUES(:name,:description,0,NOW(),NOW())`,
        { replacements: { name, description }, type: QueryTypes.INSERT, transaction },
      );
      await database.query(
        `INSERT INTO usuarios_asesores_grupos(advisor_user_id,grupo_id,created_by_user_id,created_at)
         VALUES(:advisorId,:groupId,:actorId,NOW())`,
        { replacements: { advisorId, groupId, actorId }, type: QueryTypes.INSERT, transaction },
      );
      return { id: Number(groupId), name, description, advisorId };
    });
  }

  async ownsGroup(advisorId: string, groupId: number) {
    const rows = await database.query<{ found: number }>(
      'SELECT 1 found FROM usuarios_asesores_grupos WHERE advisor_user_id=:advisorId AND grupo_id=:groupId LIMIT 1',
      { replacements: { advisorId, groupId }, type: QueryTypes.SELECT },
    );
    return Boolean(rows[0]);
  }

  async createManagedUser(values: ManagedUserValues) {
    return database.transaction(async (transaction) => {
      const owned = await database.query(
        'SELECT 1 FROM usuarios_asesores_grupos WHERE advisor_user_id=:advisorId AND grupo_id=:groupId LIMIT 1 FOR UPDATE',
        { replacements: { ...values }, type: QueryTypes.SELECT, transaction },
      );
      if (!owned.length) return { kind: 'forbidden' as const };
      const duplicate = await database.query(
        'SELECT id FROM usuarios_cuentas WHERE email=:email OR username=:username LIMIT 1 FOR UPDATE',
        { replacements: { ...values }, type: QueryTypes.SELECT, transaction },
      );
      if (duplicate.length) return { kind: 'duplicate' as const };
      const userId = randomUUID();
      const code = `ASESOR-${values.scholarshipLevel}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
      const replacements = { ...values, userId, code, activationId: randomUUID(), roleCode: values.scholarshipLevel === 6 ? 'TEACHER' : 'STUDENT' };
      await this.insertAccountAndMembership(replacements, transaction);
      // Calcula estos valores fuera de SQL. Sequelize no sustituye de forma
      // fiable un parámetro nombrado cuando se incrusta en comparaciones.
      const isDirect = values.activationMode === 'DIRECT';
      const codeValues = {
        ...replacements,
        usosHistoricos: isDirect ? 1 : 0,
        usadoPorUserId: isDirect ? userId : null,
        usadoEn: isDirect ? new Date() : null,
      };
      await database.query(
        `INSERT INTO usuarios_codigos_beca_email
         (code,allowed_email,nivel_membresia_id,vigente_desde,vigente_hasta,max_usos,usos_historicos,
          usado_por_user_id,usado_en,created_at,updated_at,estado,lote,notas)
         VALUES(:code,:email,:scholarshipLevel,CURDATE(),:expiresAt,1,
          :usosHistoricos,:usadoPorUserId,:usadoEn,NOW(),NOW(),'ACTIVE',CONCAT('ASESOR-',:advisorId),
          CONCAT('Creado por asesor para grupo ',:groupId))`,
        { replacements: codeValues, type: QueryTypes.INSERT, transaction },
      );
      if (values.activationMode === 'DIRECT') {
        await database.query(
          `INSERT INTO usuarios_activaciones_becas(id,user_id,codigo,nivel_membresia_id,activado_en,vigente_hasta)
           VALUES(:activationId,:userId,:code,:scholarshipLevel,NOW(),:expiresAt)`,
          { replacements, type: QueryTypes.INSERT, transaction },
        );
      }
      await database.query(
        `INSERT INTO usuarios_asesores_usuarios
         (advisor_user_id,user_id,grupo_id,nivel_membresia_id,activation_mode,scholarship_code,created_at,updated_at)
         VALUES(:advisorId,:userId,:groupId,:scholarshipLevel,:activationMode,:code,NOW(),NOW())`,
        { replacements, type: QueryTypes.INSERT, transaction },
      );
      return { kind: 'created' as const, id: userId, code, scholarshipActive: values.activationMode === 'DIRECT' };
    });
  }

  private async insertAccountAndMembership(values: Record<string, unknown>, transaction: Transaction) {
    await database.query(
      `INSERT INTO usuarios_cuentas
       (id,email,username,password_hash,first_name,last_name,display_name,status,email_verified_at,created_at,updated_at)
       VALUES(:userId,:email,:username,:passwordHash,:firstName,:lastName,:fullName,'ACTIVE',NOW(),NOW(),NOW())`,
      { replacements: values, type: QueryTypes.INSERT, transaction },
    );
    await database.query(
      `INSERT INTO usuarios_asignaciones_roles(user_id,role_id,assigned_by,created_at,updated_at)
       SELECT :userId,id,:actorId,NOW(),NOW() FROM usuarios_roles WHERE code=:roleCode LIMIT 1`,
      { replacements: values, type: QueryTypes.INSERT, transaction },
    );
    await database.query(
      `INSERT INTO usuarios_grupos_cuentas(grupo_id,user_id,creado_por_user_id,estado,agregado_en,actualizado_en)
       VALUES(:groupId,:userId,:actorId,'ACTIVE',NOW(),NOW())`,
      { replacements: values, type: QueryTypes.INSERT, transaction },
    );
    await database.query(
      `INSERT INTO usuarios_historial_miembros_grupos
       (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,new_status,student_name,student_email,details,created_at)
       VALUES(:groupId,:userId,:actorId,'ADDED',NULL,'ACTIVE',:fullName,:email,
        JSON_OBJECT('origin','advisor_created_account','advisor_id',:advisorId),NOW())`,
      { replacements: values, type: QueryTypes.INSERT, transaction },
    );
  }

  async setManagedUserStatus(advisorId: string | null, userId: string, status: 'ACTIVE' | 'SUSPENDED', actorId: string) {
    return database.transaction(async (transaction) => {
      const rows = await database.query<{ grupo_id: number }>(
        `SELECT grupo_id FROM usuarios_asesores_usuarios WHERE user_id=:userId
         ${advisorId ? 'AND advisor_user_id=:advisorId' : ''} LIMIT 1 FOR UPDATE`,
        { replacements: { advisorId, userId }, type: QueryTypes.SELECT, transaction },
      );
      if (!rows[0]) return 0;
      await database.query('UPDATE usuarios_cuentas SET status=:status,updated_at=NOW() WHERE id=:userId', { replacements: { userId, status }, type: QueryTypes.UPDATE, transaction });
      // Invalidar de inmediato los JWT ya emitidos. El gateway valida esta
      // tabla en cada petición, por lo que una suspensión corta también las
      // sesiones activas y no solo impide nuevos inicios de sesión.
      if (status === 'SUSPENDED') {
        await database.query(
          'UPDATE usuarios_sesiones_jwt SET revoked_at=COALESCE(revoked_at,NOW()) WHERE user_id=:userId AND revoked_at IS NULL',
          { replacements: { userId }, type: QueryTypes.UPDATE, transaction },
        );
      }
      await database.query(
        `UPDATE usuarios_grupos_cuentas SET estado=:status,actualizado_en=NOW()
         WHERE grupo_id=:groupId AND user_id=:userId AND estado<>'REMOVED'`,
        { replacements: { groupId: rows[0].grupo_id, userId, status }, type: QueryTypes.UPDATE, transaction },
      );
      await database.query(
        `INSERT INTO usuarios_historial_miembros_grupos
         (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,new_status,student_name,student_email,details,created_at)
         SELECT :groupId,c.id,:actorId,'STATUS_CHANGED',:previousStatus,:status,
           COALESCE(NULLIF(c.display_name,''),c.username),c.email,JSON_OBJECT('origin','advisor_management'),NOW()
         FROM usuarios_cuentas c WHERE c.id=:userId`,
        { replacements: { groupId: rows[0].grupo_id, userId, status, previousStatus: status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE', actorId }, type: QueryTypes.INSERT, transaction },
      );
      return 1;
    });
  }

  async updateManagedUser(values: { advisorId: string; actorId: string; userId: string; groupId: number; fullName: string; firstName: string; lastName: string | null; email: string; username: string }) {
    return database.transaction(async (transaction) => {
      const [managed, ownedGroup, duplicate] = await Promise.all([
        database.query<{ grupo_id: number }>(
          'SELECT grupo_id FROM usuarios_asesores_usuarios WHERE advisor_user_id=:advisorId AND user_id=:userId LIMIT 1 FOR UPDATE',
          { replacements: values, type: QueryTypes.SELECT, transaction },
        ),
        database.query(
          'SELECT 1 FROM usuarios_asesores_grupos WHERE advisor_user_id=:advisorId AND grupo_id=:groupId LIMIT 1',
          { replacements: values, type: QueryTypes.SELECT, transaction },
        ),
        database.query(
          'SELECT id FROM usuarios_cuentas WHERE (email=:email OR username=:username) AND id<>:userId LIMIT 1',
          { replacements: values, type: QueryTypes.SELECT, transaction },
        ),
      ]);
      if (!managed[0] || !ownedGroup.length) return { kind: 'forbidden' as const };
      if (duplicate.length) return { kind: 'duplicate' as const };

      await database.query(
        `UPDATE usuarios_cuentas SET email=:email,username=:username,first_name=:firstName,
         last_name=:lastName,display_name=:fullName,updated_at=NOW() WHERE id=:userId`,
        { replacements: values, type: QueryTypes.UPDATE, transaction },
      );
      await database.query(
        'UPDATE usuarios_asesores_usuarios SET grupo_id=:groupId,updated_at=NOW() WHERE advisor_user_id=:advisorId AND user_id=:userId',
        { replacements: values, type: QueryTypes.UPDATE, transaction },
      );
      await database.query(
        `UPDATE usuarios_grupos_cuentas SET estado='REMOVED',actualizado_en=NOW()
         WHERE user_id=:userId AND grupo_id=:oldGroupId AND grupo_id<>:groupId AND estado<>'REMOVED'`,
        { replacements: { ...values, oldGroupId: managed[0].grupo_id }, type: QueryTypes.UPDATE, transaction },
      );
      await database.query(
        `INSERT INTO usuarios_grupos_cuentas(grupo_id,user_id,creado_por_user_id,estado,agregado_en,actualizado_en)
         VALUES(:groupId,:userId,:actorId,'ACTIVE',NOW(),NOW())
         ON DUPLICATE KEY UPDATE estado='ACTIVE',actualizado_en=NOW()`,
        { replacements: values, type: QueryTypes.INSERT, transaction },
      );
      return { kind: 'updated' as const, id: values.userId, groupId: values.groupId, displayName: values.fullName, email: values.email, username: values.username };
    });
  }
}

export default new AdvisorManagementRepository();
