import { QueryTypes, type Transaction } from 'sequelize';
import { randomUUID } from 'node:crypto';
import database from '#config/database';
import type { SponsorPolicy } from './teacher-groups.types.js';

export class TeacherGroupMembersRepository {
  findAccount(email: string, username: string, transaction: Transaction) {
    return database.query<{ id: string }>(
      `SELECT id FROM usuarios_cuentas
       WHERE email=:email OR username=:username
       LIMIT 1`,
      {
        replacements: { email, username },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
  }

  async lockSponsorPolicy(userId: string, transaction: Transaction) {
    const records = await database.query<SponsorPolicy>(
      `SELECT a.id AS sponsor_activation_id,r.nivel_patrocinador_id AS sponsor_level_id,
              r.nivel_dependiente_id AS dependent_level_id,
              sponsor.name AS sponsor_name,dependent.name AS dependent_name,
              r.etiqueta_dependiente AS dependent_label,
              r.limite_lugares AS seat_limit,r.hereda_vigencia AS inherit_expiry,
              r.permite_seguimiento AS allow_progress,a.vigente_hasta
       FROM usuarios_activaciones_becas a
       INNER JOIN usuarios_reglas_dependientes_becas r
         ON r.nivel_patrocinador_id=a.nivel_membresia_id AND r.activa=1
       INNER JOIN usuarios_niveles_membresia sponsor ON sponsor.id=r.nivel_patrocinador_id
       INNER JOIN usuarios_niveles_membresia dependent ON dependent.id=r.nivel_dependiente_id
       WHERE a.user_id=:userId AND a.suspended_at IS NULL
         AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())
       ORDER BY a.activado_en DESC LIMIT 1 FOR UPDATE`,
      { replacements: { userId }, type: QueryTypes.SELECT, transaction },
    );
    return records[0] ?? null;
  }

  async findStudentInGroup(groupId: number, studentId: string, transaction: Transaction) {
    const records = await database.query<{ id: string; email: string }>(
      `SELECT c.id,c.email FROM usuarios_grupos_cuentas gc
       INNER JOIN usuarios_cuentas c ON c.id=gc.user_id
       WHERE gc.grupo_id=:groupId AND gc.user_id=:studentId AND gc.estado<>'REMOVED'
       LIMIT 1 FOR UPDATE`,
      { replacements: { groupId, studentId }, type: QueryTypes.SELECT, transaction },
    );
    return records[0] ?? null;
  }

  async grantStudentScholarship(
    student: { id: string; email: string },
    groupId: number,
    teacherId: string,
    policy: SponsorPolicy,
    expiresAt: Date | string | null,
    transaction: Transaction,
  ) {
    // La cuenta es el candado estable aunque todavía no exista una activación.
    // Evita que dos altas simultáneas observen ambas «sin beca».
    await database.query(
      'SELECT id FROM usuarios_cuentas WHERE id=:studentId LIMIT 1 FOR UPDATE',
      { replacements: { studentId: student.id }, type: QueryTypes.SELECT, transaction },
    );
    const existing = await database.query<{ id: string; codigo: string }>(
      `SELECT id,codigo FROM usuarios_activaciones_becas
       WHERE user_id=:studentId AND nivel_membresia_id=:dependentLevelId
         AND suspended_at IS NULL
         AND (vigente_hasta IS NULL OR vigente_hasta>=CURDATE())
       ORDER BY activado_en DESC LIMIT 1 FOR UPDATE`,
      {
        replacements: { studentId: student.id, dependentLevelId: policy.dependent_level_id },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    if (existing[0]) {
      await database.query(
        `UPDATE usuarios_activaciones_becas
         SET vigente_hasta=:expiresAt,patrocinador_activacion_id=:sponsorActivationId,
             grupo_origen_id=:groupId,suspended_at=NULL
         WHERE id=:id`,
        {
          replacements: {
            id: existing[0].id, expiresAt, sponsorActivationId: policy.sponsor_activation_id, groupId,
          },
          type: QueryTypes.UPDATE,
          transaction,
        },
      );
      await database.query(
        `UPDATE usuarios_codigos_beca_email SET vigente_hasta=:expiresAt,updated_at=NOW()
         WHERE code=:code`,
        {
          replacements: { code: existing[0].codigo, expiresAt },
          type: QueryTypes.UPDATE,
          transaction,
        },
      );
      return { created: false, renewed: true };
    }
    const codePrefix = policy.dependent_label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) || 'DEPENDIENTE';
    const code = `${codePrefix}-G${groupId}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    await database.query(
      `INSERT INTO usuarios_codigos_beca_email
       (code,allowed_email,nivel_membresia_id,vigente_desde,vigente_hasta,max_usos,
        usos_historicos,usado_por_user_id,usado_en,created_at,updated_at,estado,lote,notas)
       VALUES (:code,:email,:dependentLevelId,CURDATE(),:expiresAt,1,1,:studentId,NOW(),NOW(),NOW(),
        'ACTIVE',:batch,:notes)`,
      {
        replacements: {
          code,
          email: student.email,
          studentId: student.id,
          dependentLevelId: policy.dependent_level_id,
          expiresAt,
          batch: `GRUPO-${groupId}`,
          notes: `${policy.dependent_name} derivada de ${policy.sponsor_name} del patrocinador ${teacherId}`,
        },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
    await database.query(
      `INSERT INTO usuarios_activaciones_becas
       (id,user_id,codigo,nivel_membresia_id,activado_en,vigente_hasta,
        patrocinador_activacion_id,grupo_origen_id)
       VALUES (:id,:studentId,:code,:dependentLevelId,NOW(),:expiresAt,
        :sponsorActivationId,:groupId)`,
      {
        replacements: {
          id: randomUUID(), studentId: student.id, code,
          dependentLevelId: policy.dependent_level_id, expiresAt,
          sponsorActivationId: policy.sponsor_activation_id, groupId,
        },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
    await database.query(
      `UPDATE usuarios_cuentas SET scholarship_cancelled_at=NULL,updated_at=NOW()
       WHERE id=:studentId`,
      { replacements: { studentId: student.id }, type: QueryTypes.UPDATE, transaction },
    );
    return { created: true, renewed: false };
  }

  async createStudent(
    values: {
      id: string;
      email: string;
      username: string;
      passwordHash: string;
      displayName: string;
      firstName: string;
      lastName: string | null;
      groupId: number;
      creatorId: string;
    },
    transaction: Transaction,
  ) {
    await database.query(
      `INSERT INTO usuarios_cuentas
       (id,email,username,password_hash,first_name,last_name,display_name,status,
        email_verified_at,created_at,updated_at)
       VALUES (:id,:email,:username,:passwordHash,:firstName,:lastName,:displayName,
        'ACTIVE',NOW(),NOW(),NOW())`,
      { replacements: values, type: QueryTypes.INSERT, transaction },
    );
    await database.query(
      `INSERT INTO usuarios_asignaciones_roles
       (user_id,role_id,assigned_by,created_at,updated_at)
       SELECT :id,id,:creatorId,NOW(),NOW()
       FROM usuarios_roles WHERE code='STUDENT' LIMIT 1`,
      { replacements: values, type: QueryTypes.INSERT, transaction },
    );
    await database.query(
      `INSERT INTO usuarios_grupos_cuentas
       (grupo_id,user_id,creado_por_user_id,estado,agregado_en,actualizado_en)
       VALUES (:groupId,:id,:creatorId,'ACTIVE',NOW(),NOW())`,
      { replacements: values, type: QueryTypes.INSERT, transaction },
    );
    await database.query(
      `INSERT INTO usuarios_historial_miembros_grupos
       (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,
        new_status,student_name,student_email,details,created_at)
       VALUES (:groupId,:id,:creatorId,'ADDED',NULL,'ACTIVE',:displayName,:email,
        JSON_OBJECT('origin','teacher_created_account'),NOW())`,
      { replacements: values, type: QueryTypes.INSERT, transaction },
    );
  }

  async updateStudentStatus(
    groupId: number,
    studentId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    performedBy: string,
    transaction: Transaction,
  ) {
    const membership = await database.query<{
      previous_status: 'ACTIVE' | 'SUSPENDED'; student_name: string; student_email: string;
    }>(
      `SELECT CASE WHEN gc.estado IN ('ACTIVE','SUSPENDED') THEN gc.estado
                   WHEN c.status='SUSPENDED' THEN 'SUSPENDED' ELSE 'ACTIVE' END previous_status,
              COALESCE(NULLIF(c.display_name,''),c.username,c.email) student_name,
              c.email student_email
       FROM usuarios_cuentas c
       LEFT JOIN usuarios_grupos_cuentas gc
         ON gc.grupo_id=:groupId AND gc.user_id=c.id
       WHERE c.id=:studentId AND (
         (gc.estado IS NOT NULL AND gc.estado<>'REMOVED') OR EXISTS (
           SELECT 1 FROM usuarios_miembros_grupos mg
           WHERE mg.grupo_id=:groupId
             AND mg.usuario_oficial_id=c.legacy_official_user_id
         )
       )
       LIMIT 1 FOR UPDATE`,
      { replacements: { groupId, studentId }, type: QueryTypes.SELECT, transaction },
    );
    if (!membership[0]) return 0;
    const [, affectedRows] = await database.query(
      `UPDATE usuarios_grupos_cuentas
       SET estado=:status, actualizado_en=NOW()
       WHERE grupo_id=:groupId AND user_id=:studentId AND estado<>'REMOVED'`,
      {
        replacements: { groupId, studentId, status },
        type: QueryTypes.UPDATE,
        transaction,
      },
    );
    if (Number(affectedRows) > 0) {
      await database.query(
        `UPDATE usuarios_cuentas
         SET status=:status, updated_at=NOW() WHERE id=:studentId`,
        {
          replacements: { studentId, status },
          type: QueryTypes.UPDATE,
          transaction,
        },
      );
      await database.query(
        `INSERT INTO usuarios_historial_miembros_grupos
         (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,
          new_status,student_name,student_email,details,created_at)
         VALUES (:groupId,:studentId,:performedBy,'STATUS_CHANGED',:previousStatus,
          :status,:studentName,:studentEmail,NULL,NOW())`,
        {
          replacements: {
            groupId,
            studentId,
            performedBy,
            previousStatus: membership[0].previous_status,
            status,
            studentName: membership[0].student_name,
            studentEmail: membership[0].student_email,
          },
          type: QueryTypes.INSERT,
          transaction,
        },
      );
    }
    return Number(affectedRows);
  }

  async updateStudentAccount(
    values: {
      groupId: number;
      studentId: string;
      performedBy: string;
      fullName: string;
      firstName: string;
      lastName: string | null;
      email: string;
      username: string;
      passwordHash: string | null;
    },
    transaction: Transaction,
  ): Promise<'UPDATED' | 'NOT_FOUND' | 'DUPLICATE'> {
    const membership = await database.query<{ id: string; old_name: string; old_email: string; old_username: string; current_status: string }>(
      `SELECT c.id,COALESCE(NULLIF(c.display_name,''),c.username,c.email) old_name,
              c.email old_email,c.username old_username,
              CASE WHEN gc.estado='SUSPENDED' OR c.status='SUSPENDED'
                   THEN 'SUSPENDED' ELSE 'ACTIVE' END current_status
       FROM usuarios_cuentas c
       LEFT JOIN usuarios_grupos_cuentas gc
         ON gc.grupo_id=:groupId AND gc.user_id=c.id
       WHERE c.id=:studentId AND (
         (gc.estado IS NOT NULL AND gc.estado<>'REMOVED') OR EXISTS (
           SELECT 1 FROM usuarios_miembros_grupos mg
           WHERE mg.grupo_id=:groupId
             AND mg.usuario_oficial_id=c.legacy_official_user_id
             AND NOT EXISTS (
               SELECT 1 FROM usuarios_grupos_cuentas removed
               WHERE removed.grupo_id=:groupId AND removed.user_id=c.id
                 AND removed.estado='REMOVED'
             )
         )
       )
       LIMIT 1 FOR UPDATE`,
      { replacements: values, type: QueryTypes.SELECT, transaction },
    );
    if (!membership[0]) return 'NOT_FOUND';
    const duplicate = await database.query<{ id: string }>(
      `SELECT id FROM usuarios_cuentas
       WHERE id<>:studentId AND (email=:email OR username=:username)
       LIMIT 1`,
      { replacements: values, type: QueryTypes.SELECT, transaction },
    );
    if (duplicate.length) return 'DUPLICATE';
    await database.query(
      `UPDATE usuarios_cuentas SET
         display_name=:fullName,first_name=:firstName,last_name=:lastName,
         email=:email,username=:username,
         password_hash=COALESCE(:passwordHash,password_hash),updated_at=NOW()
       WHERE id=:studentId`,
      { replacements: values, type: QueryTypes.UPDATE, transaction },
    );
    await database.query(
      `INSERT INTO usuarios_historial_miembros_grupos
       (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,
        new_status,student_name,student_email,details,created_at)
       VALUES (:groupId,:studentId,:performedBy,'PROFILE_UPDATED',NULL,:currentStatus,
        :fullName,:email,
        JSON_OBJECT(
          'old_name',:oldName,'old_email',:oldEmail,'old_username',:oldUsername,
          'new_username',:username
        ),NOW())`,
      {
        replacements: {
          ...values,
          oldName: membership[0].old_name,
          oldEmail: membership[0].old_email,
          oldUsername: membership[0].old_username,
          currentStatus: membership[0].current_status,
        },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
    if (values.passwordHash) {
      await database.query(
        `INSERT INTO usuarios_historial_miembros_grupos
         (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,
          new_status,student_name,student_email,details,created_at)
         VALUES (:groupId,:studentId,:performedBy,'PASSWORD_RESET',NULL,:currentStatus,
          :fullName,:email,JSON_OBJECT('password_exposed',false),NOW())`,
        { replacements: { ...values, currentStatus: membership[0].current_status }, type: QueryTypes.INSERT, transaction },
      );
    }
    return 'UPDATED';
  }

  async removeStudentFromGroup(
    groupId: number,
    studentId: string,
    performedBy: string,
    transaction: Transaction,
  ) {
    const rows = await database.query<{
      previous_status: 'ACTIVE' | 'SUSPENDED'; student_name: string; student_email: string;
    }>(
      `SELECT CASE WHEN gc.estado IN ('ACTIVE','SUSPENDED') THEN gc.estado
                   WHEN c.status='SUSPENDED' THEN 'SUSPENDED' ELSE 'ACTIVE' END previous_status,
              COALESCE(NULLIF(c.display_name,''),c.username,c.email) student_name,
              c.email student_email
       FROM usuarios_cuentas c
       LEFT JOIN usuarios_grupos_cuentas gc
         ON gc.grupo_id=:groupId AND gc.user_id=c.id
       WHERE c.id=:studentId AND (
         (gc.estado IS NOT NULL AND gc.estado<>'REMOVED') OR EXISTS (
           SELECT 1 FROM usuarios_miembros_grupos mg
           WHERE mg.grupo_id=:groupId
             AND mg.usuario_oficial_id=c.legacy_official_user_id
         )
       )
       LIMIT 1 FOR UPDATE`,
      { replacements: { groupId, studentId }, type: QueryTypes.SELECT, transaction },
    );
    if (!rows[0]) return 0;
    const [, affectedRows] = await database.query(
      `INSERT INTO usuarios_grupos_cuentas
       (grupo_id,user_id,creado_por_user_id,estado,agregado_en,actualizado_en)
       VALUES (:groupId,:studentId,:performedBy,'REMOVED',NOW(),NOW())
       ON DUPLICATE KEY UPDATE estado='REMOVED',actualizado_en=NOW()`,
      { replacements: { groupId, studentId, performedBy }, type: QueryTypes.INSERT, transaction },
    );
    if (Number(affectedRows)) {
      await database.query(
        `INSERT INTO usuarios_historial_miembros_grupos
         (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,
          new_status,student_name,student_email,details,created_at)
         VALUES (:groupId,:studentId,:performedBy,'REMOVED',:previousStatus,
          'REMOVED',:studentName,:studentEmail,
          JSON_OBJECT('account_preserved',true,'learning_progress_preserved',true),NOW())`,
        {
          replacements: {
            groupId,
            studentId,
            performedBy,
            previousStatus: rows[0].previous_status,
            studentName: rows[0].student_name,
            studentEmail: rows[0].student_email,
          },
          type: QueryTypes.INSERT,
          transaction,
        },
      );
    }
    return Number(affectedRows);
  }

  async restoreStudentToGroup(
    groupId: number,
    studentId: string,
    performedBy: string,
    transaction: Transaction,
  ) {
    const rows = await database.query<{ student_name: string; student_email: string }>(
      `SELECT COALESCE(NULLIF(c.display_name,''),c.username,c.email) student_name,
              c.email student_email
       FROM usuarios_grupos_cuentas gc
       INNER JOIN usuarios_cuentas c ON c.id=gc.user_id
       WHERE gc.grupo_id=:groupId AND gc.user_id=:studentId AND gc.estado='REMOVED'
       LIMIT 1 FOR UPDATE`,
      { replacements: { groupId, studentId }, type: QueryTypes.SELECT, transaction },
    );
    if (!rows[0]) return 0;
    const [, affectedRows] = await database.query(
      `UPDATE usuarios_grupos_cuentas SET estado='ACTIVE',actualizado_en=NOW()
       WHERE grupo_id=:groupId AND user_id=:studentId AND estado='REMOVED'`,
      { replacements: { groupId, studentId }, type: QueryTypes.UPDATE, transaction },
    );
    if (Number(affectedRows)) {
      await database.query(
        `INSERT INTO usuarios_historial_miembros_grupos
         (grupo_id,student_user_id,performed_by_user_id,event_type,previous_status,
          new_status,student_name,student_email,details,created_at)
         VALUES (:groupId,:studentId,:performedBy,'RESTORED','REMOVED','ACTIVE',
          :studentName,:studentEmail,NULL,NOW())`,
        {
          replacements: {
            groupId,
            studentId,
            performedBy,
            studentName: rows[0].student_name,
            studentEmail: rows[0].student_email,
          },
          type: QueryTypes.INSERT,
          transaction,
        },
      );
    }
    return Number(affectedRows);
  }

}
