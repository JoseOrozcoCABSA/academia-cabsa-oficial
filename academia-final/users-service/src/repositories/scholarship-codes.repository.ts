import { Op, QueryTypes, Transaction } from 'sequelize';
import database from '#config/database';
import ScholarshipCode from '#models/CabsaBecaCodeEmail';

export type MatchMode = 'starts_with' | 'contains' | 'ends_with' | 'exact';
export interface CodeFilters {
  search?: string;
  email?: string;
  level?: number;
  status?: string;
  batch?: string;
  page: number;
  limit: number;
}
export interface CodeInput {
  code: string;
  email: string;
  levelId: number;
  starts: string | null;
  expires: string | null;
  maxUses: number;
  batch: string | null;
  notes: string | null;
}

export interface ScholarshipProfileInput {
  name: string;
  description: string;
  expirationNumber: number;
  expirationPeriod: string;
  allowSignups: boolean;
  copyAccessFrom: number | null;
  dependentLevelId: number | null;
  dependentRuleName: string | null;
  dependentLabel: string | null;
  seatLimit: number;
  inheritExpiry: boolean;
  allowProgress: boolean;
  active: boolean;
  presentationConfig: string;
}

const matchSql = (field: string, mode: MatchMode) => mode === 'exact'
  ? `${field}=:term`
  : `${field} LIKE :pattern`;
const matchPattern = (term: string, mode: MatchMode) => ({
  starts_with: `${term}%`,
  contains: `%${term}%`,
  ends_with: `%${term}`,
  exact: term,
}[mode]);

class ScholarshipCodesRepository {
  async profiles() {
    return database.query(
      `SELECT n.id,n.name,n.description,n.presentation_config,n.expiration_number,n.expiration_period,n.allow_signups,
              r.id dependent_rule_id,r.nivel_dependiente_id dependent_level_id,
              child.name dependent_level_name,r.nombre dependent_rule_name,
              r.etiqueta_dependiente dependent_label,r.limite_lugares seat_limit,
              r.hereda_vigencia inherit_expiry,r.permite_seguimiento allow_progress,r.activa rule_active,
              (SELECT COUNT(*) FROM usuarios_accesos_beca_paginas a
               WHERE a.nivel_membresia_id=n.id AND a.permitido=1) allowed_sections,
              (SELECT COUNT(*) FROM usuarios_codigos_beca_email c
               WHERE c.nivel_membresia_id=n.id) codes_count,
              (SELECT COUNT(*) FROM usuarios_activaciones_becas a
               WHERE a.nivel_membresia_id=n.id) activations_count,
              (SELECT COUNT(DISTINCT a.user_id) FROM usuarios_activaciones_becas a
               WHERE a.nivel_membresia_id=n.id AND a.suspended_at IS NULL
                 AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())) active_sponsors,
              (SELECT COUNT(DISTINCT manager.grupo_id)
               FROM usuarios_gestores_grupos manager
               INNER JOIN usuarios_activaciones_becas sponsor_activation
                 ON sponsor_activation.user_id=manager.docente_user_id
               WHERE sponsor_activation.nivel_membresia_id=n.id
                 AND sponsor_activation.suspended_at IS NULL
                 AND (sponsor_activation.vigente_hasta IS NULL OR sponsor_activation.vigente_hasta>=CURDATE())) managed_groups
       FROM usuarios_niveles_membresia n
       LEFT JOIN usuarios_reglas_dependientes_becas r ON r.nivel_patrocinador_id=n.id
       LEFT JOIN usuarios_niveles_membresia child ON child.id=r.nivel_dependiente_id
       ORDER BY n.name,n.id`,
      { type: QueryTypes.SELECT },
    );
  }

  async createProfile(input: ScholarshipProfileInput) {
    return database.transaction(async (transaction) => {
      const [createdId] = await database.query(
        `INSERT INTO usuarios_niveles_membresia
          (name,description,presentation_config,confirmation,initial_payment,billing_amount,cycle_number,
           cycle_period,billing_limit,trial_amount,trial_limit,allow_signups,
           expiration_number,expiration_period)
         VALUES(:name,:description,:presentationConfig,'',0,0,0,'Month',0,0,0,:allowSignups,
           :expirationNumber,:expirationPeriod)`,
        { replacements: { ...input, allowSignups: input.allowSignups ? 1 : 0 }, type: QueryTypes.INSERT, transaction },
      );
      const levelId = Number(createdId);
      if (input.copyAccessFrom) {
        await database.query(
          `INSERT INTO usuarios_accesos_beca_paginas
            (nivel_membresia_id,seccion_codigo,seccion_nombre,descripcion,permitido,creado_en,actualizado_en)
           SELECT :levelId,seccion_codigo,seccion_nombre,descripcion,permitido,NOW(),NOW()
           FROM usuarios_accesos_beca_paginas WHERE nivel_membresia_id=:copyAccessFrom`,
          { replacements: { levelId, copyAccessFrom: input.copyAccessFrom }, transaction },
        );
        await database.query(
          `INSERT INTO usuarios_accesos_beca_recursos
            (nivel_membresia_id,tipo_recurso,clave_recurso,permitido,creado_en,actualizado_en)
           SELECT :levelId,tipo_recurso,clave_recurso,permitido,NOW(),NOW()
           FROM usuarios_accesos_beca_recursos WHERE nivel_membresia_id=:copyAccessFrom`,
          { replacements: { levelId, copyAccessFrom: input.copyAccessFrom }, transaction },
        );
      } else {
        await database.query(
          `INSERT INTO usuarios_accesos_beca_paginas
            (nivel_membresia_id,seccion_codigo,seccion_nombre,descripcion,permitido,creado_en,actualizado_en)
           SELECT :levelId,seccion_codigo,MAX(seccion_nombre),MAX(descripcion),0,NOW(),NOW()
           FROM usuarios_accesos_beca_paginas GROUP BY seccion_codigo`,
          { replacements: { levelId }, transaction },
        );
      }
      await this.saveDependentRule(levelId, input, transaction);
      return { created: true, levelId };
    });
  }

  async updateProfile(levelId: number, input: ScholarshipProfileInput) {
    return database.transaction(async (transaction) => {
      const [, count] = await database.query(
        `UPDATE usuarios_niveles_membresia SET name=:name,description=:description,presentation_config=:presentationConfig,
          expiration_number=:expirationNumber,expiration_period=:expirationPeriod,
          allow_signups=:allowSignups WHERE id=:levelId`,
        { replacements: { ...input, levelId, allowSignups: input.allowSignups ? 1 : 0 }, type: QueryTypes.UPDATE, transaction },
      );
      if (!Number(count)) return null;
      await this.saveDependentRule(levelId, input, transaction);
      return { updated: true, levelId };
    });
  }

  private async saveDependentRule(levelId: number, input: ScholarshipProfileInput, transaction: Transaction) {
    if (!input.dependentLevelId) {
      await database.query(
        'DELETE FROM usuarios_reglas_dependientes_becas WHERE nivel_patrocinador_id=:levelId',
        { replacements: { levelId }, transaction },
      );
      return;
    }
    await database.query(
      `INSERT INTO usuarios_reglas_dependientes_becas
        (nivel_patrocinador_id,nivel_dependiente_id,nombre,etiqueta_dependiente,
         limite_lugares,hereda_vigencia,permite_seguimiento,activa)
       VALUES(:levelId,:dependentLevelId,:dependentRuleName,:dependentLabel,:seatLimit,
         :inheritExpiry,:allowProgress,:active)
       ON DUPLICATE KEY UPDATE nivel_dependiente_id=VALUES(nivel_dependiente_id),
         nombre=VALUES(nombre),etiqueta_dependiente=VALUES(etiqueta_dependiente),
         limite_lugares=VALUES(limite_lugares),hereda_vigencia=VALUES(hereda_vigencia),
         permite_seguimiento=VALUES(permite_seguimiento),activa=VALUES(activa)`,
      {
        replacements: {
          levelId, dependentLevelId: input.dependentLevelId,
          dependentRuleName: input.dependentRuleName || `${input.name} con dependientes`,
          dependentLabel: input.dependentLabel || 'Dependiente', seatLimit: input.seatLimit,
          inheritExpiry: input.inheritExpiry ? 1 : 0, allowProgress: input.allowProgress ? 1 : 0,
          active: input.active ? 1 : 0,
        },
        transaction,
      },
    );
    // La regla es la fuente de verdad. Un cambio de cupo se propaga a todos
    // los grupos ya provisionados para patrocinadores de este nivel.
    await database.query(
      `UPDATE usuarios_gestores_grupos manager
       INNER JOIN usuarios_activaciones_becas activation
         ON activation.user_id=manager.docente_user_id
       SET manager.limite_lugares=:seatLimit,manager.actualizado_en=NOW()
       WHERE activation.nivel_membresia_id=:levelId
         AND activation.suspended_at IS NULL
         AND (activation.vigente_hasta IS NULL OR activation.vigente_hasta>=CURDATE())`,
      { replacements: { levelId, seatLimit: input.seatLimit }, transaction },
    );
  }

  async overview() {
    const [stats, levels, batches] = await Promise.all([
      database.query(
        `SELECT COUNT(*) total,
          SUM(estado='ACTIVE') active,
          SUM(estado='REVOKED') revoked,
          SUM(usado_por_user_id IS NOT NULL OR usos_historicos>=max_usos) used,
          SUM(vigente_hasta IS NOT NULL AND vigente_hasta<CURDATE()) expired,
          SUM(estado='ACTIVE' AND usado_por_user_id IS NULL AND usos_historicos<max_usos
            AND (vigente_desde IS NULL OR vigente_desde<=CURDATE())
            AND (vigente_hasta IS NULL OR vigente_hasta>=CURDATE())) available,
          SUM(estado='ACTIVE' AND vigente_desde IS NOT NULL AND vigente_desde>CURDATE()) scheduled,
          SUM(allowed_email='') without_email,
          COUNT(DISTINCT NULLIF(lote,'')) batches
         FROM usuarios_codigos_beca_email`,
        { type: QueryTypes.SELECT, plain: true },
      ),
      database.query(
        `SELECT id,name,description,expiration_number,expiration_period
         FROM usuarios_niveles_membresia ORDER BY id`,
        { type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT lote,COUNT(*) total,
          SUM(usado_por_user_id IS NOT NULL OR usos_historicos>=max_usos) used,
          MAX(created_at) created_at
         FROM usuarios_codigos_beca_email WHERE lote IS NOT NULL AND lote<>''
         GROUP BY lote ORDER BY created_at DESC LIMIT 50`,
        { type: QueryTypes.SELECT },
      ),
    ]);
    return { stats, levels, batches };
  }

  async list(filters: CodeFilters) {
    const clauses = ['1=1'];
    const replacements: Record<string, unknown> = {
      search: `%${filters.search || ''}%`,
      email: `%${filters.email || ''}%`,
      level: filters.level || 0,
      batch: filters.batch || '',
      limit: filters.limit,
      offset: (filters.page - 1) * filters.limit,
    };
    if (filters.search) clauses.push('c.code LIKE :search');
    if (filters.email) clauses.push('c.allowed_email LIKE :email');
    if (filters.level) clauses.push('c.nivel_membresia_id=:level');
    if (filters.batch) clauses.push('c.lote=:batch');
    if (filters.status === 'ACTIVE' || filters.status === 'REVOKED') clauses.push(`c.estado='${filters.status}'`);
    if (filters.status === 'USED') clauses.push('(c.usado_por_user_id IS NOT NULL OR c.usos_historicos>=c.max_usos)');
    if (filters.status === 'AVAILABLE') clauses.push(`c.estado='ACTIVE' AND c.usado_por_user_id IS NULL AND c.usos_historicos<c.max_usos AND (c.vigente_desde IS NULL OR c.vigente_desde<=CURDATE()) AND (c.vigente_hasta IS NULL OR c.vigente_hasta>=CURDATE())`);
    if (filters.status === 'EXPIRED') clauses.push('c.vigente_hasta IS NOT NULL AND c.vigente_hasta<CURDATE()');
    const where = clauses.join(' AND ');
    const [rows, count] = await Promise.all([
      database.query(
        `SELECT c.*,n.name membership_name,u.display_name used_by_name,u.email used_by_email,
          a.id activation_id,a.suspended_at,
          CASE
            WHEN c.estado='REVOKED' THEN 'REVOKED'
            WHEN c.usado_por_user_id IS NOT NULL OR c.usos_historicos>=c.max_usos THEN 'USED'
            WHEN c.vigente_hasta IS NOT NULL AND c.vigente_hasta<CURDATE() THEN 'EXPIRED'
            WHEN c.vigente_desde IS NOT NULL AND c.vigente_desde>CURDATE() THEN 'SCHEDULED'
            ELSE 'AVAILABLE' END computed_status
         FROM usuarios_codigos_beca_email c
         LEFT JOIN usuarios_niveles_membresia n ON n.id=c.nivel_membresia_id
         LEFT JOIN usuarios_cuentas u ON u.id=c.usado_por_user_id
         LEFT JOIN usuarios_activaciones_becas a ON a.id=(
           SELECT a2.id FROM usuarios_activaciones_becas a2
           WHERE CONVERT(a2.codigo USING utf8mb4) COLLATE utf8mb4_unicode_ci
             = CONVERT(c.code USING utf8mb4) COLLATE utf8mb4_unicode_ci
           ORDER BY a2.activado_en DESC LIMIT 1)
         WHERE ${where} ORDER BY c.updated_at DESC,c.created_at DESC,c.id DESC
         LIMIT :limit OFFSET :offset`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT COUNT(*) total FROM usuarios_codigos_beca_email c WHERE ${where}`,
        { replacements, type: QueryTypes.SELECT, plain: true },
      ) as Promise<{ total: number } | null>,
    ]);
    return { rows, pagination: { page: filters.page, limit: filters.limit, total: Number(count?.total || 0) } };
  }

  async existingFor(codes: string[], emails: string[]) {
    if (!codes.length && !emails.length) return [];
    const rows = await ScholarshipCode.findAll({
      attributes: ['id', 'code', 'allowed_email'],
      where: {
        [Op.or]: [
          ...(codes.length ? [{ code: { [Op.in]: codes } }] : []),
          ...(emails.length ? [{ allowed_email: { [Op.in]: emails } }] : []),
        ],
      },
      raw: true,
    });
    return rows as unknown as Array<{ id: number; code: string; allowed_email: string }>;
  }

  async upsertMany(inputs: CodeInput[]) {
    return database.transaction(async (transaction) => {
      const existing = await ScholarshipCode.findAll({
        attributes: ['code'],
        where: { code: { [Op.in]: inputs.map(({ code }) => code) } },
        raw: true,
        transaction,
      }) as unknown as Array<{ code: string }>;
      const now = new Date();
      await ScholarshipCode.bulkCreate(inputs.map((input) => ({
        code: input.code,
        allowed_email: input.email,
        nivel_membresia_id: input.levelId,
        vigente_desde: input.starts,
        vigente_hasta: input.expires,
        max_usos: input.maxUses,
        usos_historicos: 0,
        estado: 'ACTIVE',
        lote: input.batch,
        notas: input.notes,
        created_at: now,
        updated_at: now,
      })), {
        updateOnDuplicate: [
          'allowed_email', 'nivel_membresia_id', 'vigente_desde', 'vigente_hasta',
          'max_usos', 'estado', 'lote', 'notas', 'updated_at',
        ],
        transaction,
      });
      const updated = existing.length;
      const inserted = inputs.length - updated;
      return { inserted, updated, total: inputs.length };
    });
  }

  async update(id: number, input: Partial<CodeInput> & { state?: string }) {
    const record = await ScholarshipCode.findByPk(id);
    if (!record) return null;
    const current = record.get({ plain: true }) as Record<string, unknown>;
    const values = {
      id,
      code: input.code ?? current.code,
      email: input.email ?? current.allowed_email,
      levelId: input.levelId ?? current.nivel_membresia_id,
      starts: input.starts === undefined ? current.vigente_desde : input.starts,
      expires: input.expires === undefined ? current.vigente_hasta : input.expires,
      maxUses: input.maxUses ?? current.max_usos,
      batch: input.batch === undefined ? current.lote : input.batch,
      notes: input.notes === undefined ? current.notas : input.notes,
      state: input.state ?? current.estado,
    };
    await record.update({
      code: values.code, allowed_email: values.email,
      nivel_membresia_id: values.levelId, vigente_desde: values.starts,
      vigente_hasta: values.expires, max_usos: values.maxUses,
      lote: values.batch, notas: values.notes, estado: values.state,
      updated_at: new Date(),
    });
    return values;
  }

  async remove(id: number) {
    return ScholarshipCode.destroy({
      where: { id, usado_por_user_id: null, usos_historicos: 0 },
    });
  }

  async patternPreview(term: string, mode: MatchMode) {
    const replacements = { term, pattern: matchPattern(term, mode) };
    const rows = await database.query(
      `SELECT id,code,allowed_email,estado,lote,nivel_membresia_id,vigente_hasta,
        (usado_por_user_id IS NOT NULL OR usos_historicos>=max_usos) used
       FROM usuarios_codigos_beca_email WHERE ${matchSql('code', mode)}
       ORDER BY code LIMIT 1000`,
      { replacements, type: QueryTypes.SELECT },
    );
    return { rows, total: rows.length, used: rows.filter((row) => Boolean((row as { used: number }).used)).length };
  }

  async patternRemove(term: string, mode: MatchMode) {
    const preview = await this.patternPreview(term, mode);
    return database.transaction(async (transaction) => {
      const replacements = { term, pattern: matchPattern(term, mode) };
      await database.query(
        `UPDATE usuarios_codigos_beca_email SET estado='REVOKED',updated_at=NOW()
         WHERE ${matchSql('code', mode)}
           AND (usado_por_user_id IS NOT NULL OR usos_historicos>=max_usos)`,
        { replacements, transaction },
      );
      await database.query(
        `DELETE FROM usuarios_codigos_beca_email WHERE ${matchSql('code', mode)}
         AND usado_por_user_id IS NULL AND usos_historicos=0`,
        { replacements, transaction },
      );
      return {
        matched: preview.total,
        deleted: preview.total - preview.used,
        revoked: preview.used,
      };
    });
  }

  async group(term: string, mode: MatchMode) {
    const replacements = { term, pattern: matchPattern(term, mode) };
    const where = matchSql('c.code', mode);
    const [codes, users] = await Promise.all([
      database.query(
        `SELECT c.id,c.code,c.allowed_email,c.nivel_membresia_id,n.name membership_name,
          c.vigente_desde,c.vigente_hasta,c.estado,c.usos_historicos,c.max_usos,c.usado_en,
          (c.usado_por_user_id IS NOT NULL OR c.usos_historicos>=c.max_usos) used
         FROM usuarios_codigos_beca_email c
         LEFT JOIN usuarios_niveles_membresia n ON n.id=c.nivel_membresia_id
         WHERE ${where} ORDER BY c.code LIMIT 1000`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query(
        `SELECT a.id activation_id,a.codigo,a.activado_en,a.vigente_hasta activation_expires,a.suspended_at,
          u.id user_id,u.legacy_wp_user_id,u.display_name,u.email,
          a.nivel_membresia_id,n.name membership_name,m.id legacy_membership_id,
          m.startdate,m.enddate,m.status
         FROM usuarios_activaciones_becas a
         INNER JOIN usuarios_codigos_beca_email c
           ON CONVERT(c.code USING utf8mb4) COLLATE utf8mb4_unicode_ci
            = CONVERT(a.codigo USING utf8mb4) COLLATE utf8mb4_unicode_ci
         INNER JOIN usuarios_cuentas u ON u.id=a.user_id
         LEFT JOIN usuarios_niveles_membresia n ON n.id=a.nivel_membresia_id
         LEFT JOIN usuarios_membresias m ON m.id=(
           SELECT m2.id FROM usuarios_membresias m2
           WHERE m2.user_id=u.legacy_wp_user_id AND m2.membership_id=a.nivel_membresia_id
           ORDER BY (m2.status='active') DESC,m2.id DESC LIMIT 1)
         WHERE ${where} ORDER BY a.activado_en DESC LIMIT 1000`,
        { replacements, type: QueryTypes.SELECT },
      ),
    ]);
    const typedCodes = codes as Array<{ used: number; allowed_email: string }>;
    return {
      codes,
      users,
      stats: {
        totalCodes: codes.length,
        usedCodes: typedCodes.filter((row) => Boolean(row.used)).length,
        mappedEmails: typedCodes.filter((row) => Boolean(row.allowed_email)).length,
        activatedUsers: new Set((users as Array<{ user_id: string }>).map((row) => row.user_id)).size,
      },
    };
  }

  async setActivationSuspended(activationId: string, suspended: boolean) {
    return database.transaction(async (transaction) => {
      const records = await database.query<{
        user_id: string;
        legacy_wp_user_id: number | null;
        nivel_membresia_id: number;
        vigente_hasta: string | null;
      }>(
        `SELECT a.user_id,a.nivel_membresia_id,a.vigente_hasta,u.legacy_wp_user_id
         FROM usuarios_activaciones_becas a
         INNER JOIN usuarios_cuentas u ON u.id=a.user_id
         WHERE a.id=:activationId LIMIT 1 FOR UPDATE`,
        { replacements: { activationId }, type: QueryTypes.SELECT, transaction },
      );
      const activation = records[0];
      if (!activation) return null;
      await database.query(
        `UPDATE usuarios_activaciones_becas
         SET suspended_at=${suspended ? 'NOW()' : 'NULL'} WHERE id=:activationId`,
        { replacements: { activationId }, type: QueryTypes.UPDATE, transaction },
      );
      await database.query(
        `UPDATE usuarios_activaciones_becas
         SET suspended_at=${suspended ? 'NOW()' : 'NULL'}
         WHERE patrocinador_activacion_id=:activationId`,
        { replacements: { activationId }, type: QueryTypes.UPDATE, transaction },
      );
      await database.query(
        `UPDATE usuarios_cuentas SET scholarship_cancelled_at=${suspended ? 'NOW()' : 'NULL'},updated_at=NOW()
         WHERE id=:userId`,
        { replacements: { userId: activation.user_id }, type: QueryTypes.UPDATE, transaction },
      );
      if (activation.legacy_wp_user_id) {
        await database.query(
          `UPDATE usuarios_membresias SET status=:status,
             enddate=CASE WHEN :suspended=1 THEN enddate ELSE ${activation.vigente_hasta ? "CONCAT(:expires,' 23:59:59')" : 'NULL'} END,
             modified=NOW()
           WHERE user_id=:legacyId AND membership_id=:membershipId`,
          {
            replacements: {
              status: suspended ? 'cancelled' : 'active',
              suspended: suspended ? 1 : 0,
              expires: activation.vigente_hasta,
              legacyId: activation.legacy_wp_user_id,
              membershipId: activation.nivel_membresia_id,
            },
            type: QueryTypes.UPDATE,
            transaction,
          },
        );
      }
      return { suspended, activationId, userId: activation.user_id };
    });
  }

  async updateActivationExpiry(
    activationIds: string[],
    endDate: string,
    transaction?: Transaction,
  ) {
    if (!activationIds.length) return 0;
    const [, count] = await database.query(
      'UPDATE usuarios_activaciones_becas SET vigente_hasta=:endDate WHERE id IN (:ids)',
      {
        replacements: { endDate, ids: activationIds },
        transaction,
        type: QueryTypes.UPDATE,
      },
    );
    await database.query(
      `UPDATE usuarios_activaciones_becas child
       INNER JOIN usuarios_reglas_dependientes_becas rule
         ON rule.nivel_dependiente_id=child.nivel_membresia_id
       SET child.vigente_hasta=:endDate
       WHERE child.patrocinador_activacion_id IN (:ids) AND rule.hereda_vigencia=1`,
      { replacements: { endDate, ids: activationIds }, transaction, type: QueryTypes.UPDATE },
    );
    await database.query(
      `UPDATE usuarios_codigos_beca_email code
       INNER JOIN usuarios_activaciones_becas child
         ON CONVERT(child.codigo USING utf8mb4) COLLATE utf8mb4_unicode_ci
          =CONVERT(code.code USING utf8mb4) COLLATE utf8mb4_unicode_ci
       SET code.vigente_hasta=:endDate,code.updated_at=NOW()
       WHERE child.patrocinador_activacion_id IN (:ids)`,
      { replacements: { endDate, ids: activationIds }, transaction, type: QueryTypes.UPDATE },
    );
    await database.query(
      `UPDATE usuarios_membresias m
       INNER JOIN usuarios_cuentas u ON u.legacy_wp_user_id=m.user_id
       INNER JOIN usuarios_activaciones_becas a ON a.user_id=u.id
         AND a.nivel_membresia_id=m.membership_id
       SET m.enddate=CONCAT(:endDate,' 23:59:59'),m.modified=NOW()
       WHERE a.id IN (:ids) AND m.status='active'`,
      { replacements: { endDate, ids: activationIds }, transaction },
    );
    return Number(count || 0);
  }
}

export default new ScholarshipCodesRepository();
