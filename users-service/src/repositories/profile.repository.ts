/**
 * @file Consultas del perfil, incluidas las tablas heredadas de becas y grupos.
 *
 * Convive con dos generaciones de datos: la cuenta vive en el modelo Sequelize
 * `SoaUsers`, mientras que la beca y el grupo estan en tablas antiguas a las que
 * se llega con SQL directo. Ambas consultas usan `replacements`, asi que los
 * valores van parametrizados y no se concatenan.
 *
 * @see services/profile.service.ts Quien usa estos datos.
 */

import { QueryTypes } from 'sequelize';
import database from '#config/database';
import SoaUsers from '#models/SoaUsers';

/**
 * Fila de beca aprobada.
 *
 * `beca_id` puede ser nulo en registros antiguos, por lo que el servicio cae al
 * `id` de la propia fila para identificarla.
 */
export interface ScholarshipRecord {
  id: number;
  beca_id: number | null;
  total_becas_aprobadas: number;
  validated_at: Date;
}

export interface MembershipRecord {
  id: number;
  name: string;
  description: string | null;
  presentation_config: string | null;
  activated_at: Date;
}

/** Grupo al que pertenece el usuario. Los nombres de campo son los de la tabla heredada. */
export interface GroupRecord {
  id: number;
  nombre: string;
  descripcion: string | null;
}

/** Consultas de perfil. */
export class ProfileRepository {
  /** Cuenta por clave primaria. Devuelve la instancia Sequelize, no un objeto plano. */
  findUserById(id: string) {
    return SoaUsers.findByPk(id);
  }

  /**
   * Escribe los valores indicados en la cuenta.
   *
   * A diferencia del repositorio generico, aqui **no se filtran las claves**:
   * lo que llegue en `values` se envia a la actualizacion. Es seguro porque los
   * dos unicos llamantes construyen el objeto con claves fijas, nunca con el
   * cuerpo de la peticion. Pasarle datos del cliente sin filtrar seria una
   * asignacion masiva.
   */
  async updateUser(id: string, values: Record<string, unknown>): Promise<void> {
    await SoaUsers.update(values, { where: { id } });
  }

  /**
   * Beca aprobada mas reciente asociada a un correo.
   *
   * Compara con `LOWER()` en los dos lados porque los correos heredados no
   * tienen un criterio uniforme de mayusculas. Exige
   * `total_becas_aprobadas > 0`, de modo que una solicitud pendiente no cuenta
   * como beca.
   *
   * @returns La fila mas reciente por fecha de validacion, o `null`.
   */
  async findScholarshipByEmail(email: string): Promise<ScholarshipRecord | null> {
    const records = await database.query<ScholarshipRecord>(
      `SELECT id, beca_id, total_becas_aprobadas, validated_at
       FROM usuarios_becas
       WHERE LOWER(becas_correo) = LOWER(:email)
         AND total_becas_aprobadas > 0
       ORDER BY validated_at DESC, id DESC
       LIMIT 1`,
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      },
    );
    return records[0] ?? null;
  }

  async findCurrentMembership(
    userId: string,
    legacyWpUserId: number | null,
  ): Promise<MembershipRecord | null> {
    const records = await database.query<MembershipRecord>(
      `SELECT membership.id, membership.name, membership.description, membership.presentation_config, membership.activated_at
       FROM (
         SELECT a.nivel_membresia_id AS id,
                COALESCE(n.name, CONCAT('Beca CABSA #',a.nivel_membresia_id)) AS name,
                n.description,
                n.presentation_config,
                a.activado_en AS activated_at,
                1 AS priority
         FROM usuarios_activaciones_becas a
         LEFT JOIN usuarios_niveles_membresia n ON n.id=a.nivel_membresia_id
          WHERE a.user_id=:userId
            AND a.suspended_at IS NULL
            AND (a.vigente_hasta IS NULL OR a.vigente_hasta >= CURDATE())
            AND (a.patrocinador_activacion_id IS NULL OR EXISTS (
              SELECT 1 FROM usuarios_activaciones_becas sponsor
              WHERE sponsor.id=a.patrocinador_activacion_id
                AND sponsor.suspended_at IS NULL
                AND (sponsor.vigente_hasta IS NULL OR sponsor.vigente_hasta>=CURDATE())
            ))
         UNION ALL
         SELECT m.membership_id AS id,
                COALESCE(n.name, CONCAT('Membresía CABSA #',m.membership_id)) AS name,
                n.description,
                n.presentation_config,
                m.startdate AS activated_at,
                2 AS priority
         FROM usuarios_membresias m
         LEFT JOIN usuarios_niveles_membresia n ON n.id=m.membership_id
         WHERE :legacyWpUserId IS NOT NULL
           AND m.user_id=:legacyWpUserId
           AND m.status='active'
           AND (m.enddate IS NULL OR m.enddate >= NOW())
       ) membership
       ORDER BY membership.priority, membership.activated_at DESC
       LIMIT 1`,
      {
        replacements: { userId, legacyWpUserId },
        type: QueryTypes.SELECT,
      },
    );
    return records[0] ?? null;
  }

  async findSuspendedMembership(userId: string): Promise<MembershipRecord | null> {
    const records = await database.query<MembershipRecord>(
      `SELECT a.nivel_membresia_id id,
              COALESCE(n.name,CONCAT('Beca CABSA #',a.nivel_membresia_id)) name,
              n.description,
              n.presentation_config,
              a.activado_en activated_at
       FROM usuarios_activaciones_becas a
       LEFT JOIN usuarios_niveles_membresia n ON n.id=a.nivel_membresia_id
       WHERE a.user_id=:userId AND a.suspended_at IS NOT NULL
         AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURDATE())
       ORDER BY a.suspended_at DESC LIMIT 1`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
    return records[0] ?? null;
  }

  /**
   * Grupo mas reciente al que se agrego el usuario.
   *
   * Limitado a uno: si el usuario pertenece a varios grupos, los demas no se
   * devuelven. El perfil muestra un solo grupo por diseno.
   *
   * Se busca por `usuario_oficial_id`, el identificador del sistema anterior, no
   * por el de la cuenta nueva.
   */
  async membershipPageAccess(membershipLevelId: number | null) {
    if (!membershipLevelId) return [];
    return database.query<{ code: string; allowed: number }>(
      `SELECT seccion_codigo code,permitido allowed
       FROM usuarios_accesos_beca_paginas
       WHERE nivel_membresia_id=:membershipLevelId`,
      { replacements: { membershipLevelId }, type: QueryTypes.SELECT },
    );
  }

  async membershipResourceAccess(membershipLevelId: number | null) {
    if (!membershipLevelId) return [];
    return database.query<{ type: string; resource_key: string; allowed: number }>(
      `SELECT tipo_recurso type,clave_recurso resource_key,permitido allowed
       FROM usuarios_accesos_beca_recursos
       WHERE nivel_membresia_id=:membershipLevelId`,
      { replacements: { membershipLevelId }, type: QueryTypes.SELECT },
    );
  }

  async findGroupByOfficialUserId(
    officialUserId: number,
  ): Promise<GroupRecord | null> {
    const records = await database.query<GroupRecord>(
      `SELECT g.id, g.nombre, g.descripcion
       FROM usuarios_miembros_grupos AS ug
       INNER JOIN usuarios_grupos AS g ON g.id = ug.grupo_id
       WHERE ug.usuario_oficial_id = :officialUserId
       ORDER BY ug.agregado_en DESC, ug.id DESC
       LIMIT 1`,
      {
        replacements: { officialUserId },
        type: QueryTypes.SELECT,
      },
    );
    return records[0] ?? null;
  }
}

/** Instancia de `ProfileRepository` lista para usar. */
export default new ProfileRepository();
