/**
 * @file Acceso a datos de registro y autenticación.
 *
 * Mezcla dos estilos: el modelo Sequelize `SoaUsers` para la tabla de cuentas, y
 * SQL a mano para el catálogo geográfico y las tablas heredadas de FOMAQRO, que
 * no tienen modelo.
 *
 * @see services/auth.service.ts Reglas de negocio.
 */

import { Op, QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';
import SoaUsers from '#models/SoaUsers';
import PasswordResetTokens from '#models/PasswordResetTokens';

/**
 * Fila del catálogo postal: una por colonia.
 *
 * Un código postal devuelve varias filas —una por colonia— repitiendo estado y
 * municipio. El servicio las agrupa antes de responder.
 */
export interface PostalAddressRecord {
  postal_code: number;
  colony_id: number;
  colony: string;
  municipality_id: number;
  municipality_code: string | null;
  municipality: string;
  state_id: number;
  state_code: string | null;
  state: string;
  city_id: number;
  city: string;
  settlement_type: string | null;
  zone: string | null;
}

interface AuthorizationRecord {
  role_code: string;
  permission_code: string | null;
}

/** Consultas de registro y autenticación. */
export class AuthRepository {
  /**
   * Busca la cuenta por correo **o** por nombre de usuario.
   *
   * Permite iniciar sesión con cualquiera de los dos en un único campo. La
   * comparación la hace MySQL, así que distingue mayúsculas según el *collation*
   * de la columna.
   */
  findByIdentity(identity: string) {
    return SoaUsers.findOne({
      where: { [Op.or]: [{ email: identity }, { username: identity }] },
    });
  }

  findByEmail(email: string) {
    return SoaUsers.findOne({ where: { email } });
  }

  /** Obtiene roles y permisos vigentes para incluirlos en el token. */
  async authorizationForUser(userId: string) {
    const records = await database.query<AuthorizationRecord>(
      `SELECT r.code AS role_code, p.code AS permission_code
       FROM usuarios_asignaciones_roles AS ur
       INNER JOIN usuarios_roles AS r ON r.id = ur.role_id
       LEFT JOIN usuarios_roles_permisos AS rp ON rp.role_id = r.id
       LEFT JOIN usuarios_permisos AS p ON p.id = rp.permission_id
       WHERE ur.user_id = :userId
       ORDER BY r.code, p.code`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      },
    );
    const roles = [...new Set(records.map((record) => record.role_code))];
    const permissions = [...new Set(
      records.map((record) => record.permission_code).filter(
        (permission): permission is string => Boolean(permission),
      ),
    )];
    return { role: roles[0], roles, permissions };
  }

  createSession(sessionId: string, userId: string) {
    return database.query(
      `INSERT INTO usuarios_sesiones_jwt (id,user_id,created_at)
       VALUES (:sessionId,:userId,NOW())`,
      { replacements: { sessionId, userId }, type: QueryTypes.INSERT },
    );
  }

  revokeSessions(userId: string) {
    return database.query(
      `UPDATE usuarios_sesiones_jwt SET revoked_at=COALESCE(revoked_at,NOW())
       WHERE user_id=:userId AND revoked_at IS NULL`,
      { replacements: { userId }, type: QueryTypes.UPDATE },
    );
  }

  /**
   * Reserva atómicamente un envío de restablecimiento por correo.
   *
   * El `UPDATE` condicional serializa solicitudes concurrentes sobre una fila
   * existente. Para el primer envío, la PK por correo hace que sólo uno de dos
   * `INSERT IGNORE` simultáneos gane. Así la ventana no depende de un
   * «consultar y luego guardar» susceptible a carreras.
   */
  async reservePasswordResetToken(
    email: string,
    token: string,
    minimumIntervalSeconds: number,
  ): Promise<boolean> {
    const replacements = { email, token, minimumIntervalSeconds };
    const [, updated] = await database.query(
      `UPDATE usuarios_tokens_restablecimiento
          SET token=:token,created_at=NOW()
        WHERE email=:email
          AND (created_at IS NULL
            OR created_at<=DATE_SUB(NOW(),INTERVAL :minimumIntervalSeconds SECOND))`,
      { replacements, type: QueryTypes.UPDATE },
    );
    if (Number(updated) > 0) return true;

    const [, inserted] = await database.query(
      `INSERT IGNORE INTO usuarios_tokens_restablecimiento (email,token,created_at)
       VALUES (:email,:token,NOW())`,
      { replacements, type: QueryTypes.INSERT },
    );
    return Number(inserted) > 0;
  }

  findPasswordResetToken(email: string, token: string) {
    return PasswordResetTokens.findOne({ where: { email, token } });
  }

  deletePasswordResetToken(email: string) {
    return PasswordResetTokens.destroy({ where: { email } });
  }

  saveEmailVerification(userId: string, codeHash: string) {
    return database.query(
      `INSERT INTO usuarios_verificaciones_email
       (user_id,code_hash,expires_at,attempts,sent_at,created_at)
       VALUES (:userId,:codeHash,DATE_ADD(NOW(),INTERVAL 15 MINUTE),0,NOW(),NOW())
       ON DUPLICATE KEY UPDATE code_hash=VALUES(code_hash),
         expires_at=VALUES(expires_at),attempts=0,sent_at=NOW()`,
      { replacements: { userId, codeHash } },
    );
  }

  async emailVerificationByEmail(email: string, transaction?: Transaction) {
    const records = await database.query<{
      user_id: string;
      code_hash: string;
      expires_at: Date;
      attempts: number;
      sent_at: Date;
      status: string;
      email_verified_at: Date | null;
    }>(
      `SELECT v.user_id,v.code_hash,v.expires_at,v.attempts,v.sent_at,
              u.status,u.email_verified_at
       FROM usuarios_verificaciones_email v
       INNER JOIN usuarios_cuentas u ON u.id=v.user_id
       WHERE LOWER(u.email)=LOWER(:email)
       LIMIT 1${transaction ? ' FOR UPDATE' : ''}`,
      { replacements: { email }, type: QueryTypes.SELECT, transaction },
    );
    return records[0] ?? null;
  }

  incrementEmailVerificationAttempts(userId: string, transaction?: Transaction) {
    return database.query(
      'UPDATE usuarios_verificaciones_email SET attempts=attempts+1 WHERE user_id=:userId',
      { replacements: { userId }, transaction },
    );
  }

  /**
   * Reserva un intento de verificación de forma atómica.
   *
   * El incremento y la comprobación del tope viajan en la **misma** sentencia,
   * de modo que dos peticiones simultáneas no pueden leer el mismo contador y
   * pasar ambas. Antes se leía el registro, se comprobaba el tope y se
   * incrementaba después: N peticiones en paralelo leían todas el mismo valor y
   * el límite de cinco intentos sobre un código de seis dígitos se saturaba en
   * paralelo.
   *
   * Es la variante «consumir y luego comprobar»: se paga el intento **antes** de
   * saber si el código es correcto. Un intento acertado gasta uno de los cinco,
   * lo cual no importa porque a continuación el registro se elimina.
   *
   * @param maxAttempts Tope de intentos; se compara dentro del `WHERE`.
   * @returns `true` si quedaba cupo y el intento se reservó.
   */
  async consumeEmailVerificationAttempt(
    email: string,
    maxAttempts: number,
  ): Promise<boolean> {
    const result = await database.query(
      `UPDATE usuarios_verificaciones_email v
         INNER JOIN usuarios_cuentas u ON u.id=v.user_id
          SET v.attempts=v.attempts+1
        WHERE LOWER(u.email)=LOWER(:email)
          AND v.attempts < :maxAttempts
          AND v.expires_at > NOW()`,
      { replacements: { email, maxAttempts }, type: QueryTypes.UPDATE },
    );
    // Con `QueryTypes.UPDATE`, Sequelize devuelve `[filas, afectadas]`; en
    // MySQL sólo la segunda posición trae el número de filas modificadas.
    return Number((result as unknown as [unknown, number])[1] ?? 0) > 0;
  }

  async activateVerifiedEmail(userId: string, transaction: Transaction) {
    await SoaUsers.update(
      { status: 'ACTIVE', email_verified_at: new Date(), updated_at: new Date() },
      { where: { id: userId }, transaction },
    );
    await database.query(
      'DELETE FROM usuarios_verificaciones_email WHERE user_id=:userId',
      { replacements: { userId }, transaction },
    );
  }

  async updatePassword(userId: string, passwordHash: string) {
    const result = await SoaUsers.update(
      { password_hash: passwordHash, updated_at: new Date() },
      { where: { id: userId } },
    );
    await this.revokeSessions(userId);
    return result;
  }

  /**
   * Comprueba si ya existe una cuenta con ese correo o ese usuario.
   *
   * Devuelve el primer registro que coincida con cualquiera de los dos, sin
   * indicar cuál fue: quien llama no puede distinguir si el conflicto es del
   * correo o del usuario.
   */
  findExisting(email: string, username: string) {
    return SoaUsers.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });
  }

  /**
   * Inserta la cuenta.
   *
   * No valida ni cifra nada: espera recibir el `password_hash` ya calculado.
   */
  create(data: Record<string, unknown>, transaction?: Transaction) {
    return SoaUsers.create(data, { transaction });
  }

  /** Abre una transacción gestionada, para que cuenta y perfil se creen juntos. */
  transaction<T>(callback: (transaction: Transaction) => Promise<T>) {
    return database.transaction(callback);
  }

  /**
   * Resuelve un código postal a estado, municipio y colonias.
   *
   * Convierte el código a número antes de consultar, porque la columna es
   * numérica; eso descarta de paso cualquier código con letras. Ordena las
   * colonias por nombre.
   *
   * @returns Una fila por colonia. Vacío si el código no está en el catálogo.
   */
  async findPostalCode(postalCode: string): Promise<PostalAddressRecord[]> {
    return database.query<PostalAddressRecord>(
      `SELECT
         cp.codigo_postal AS postal_code,
         c.id_colonia AS colony_id,
         c.nombre_colonia AS colony,
         m.id_municipio AS municipality_id,
         m.clave_municipio AS municipality_code,
         m.nombre_municipio AS municipality,
         e.id_estado AS state_id,
         e.clave_estado AS state_code,
         e.nombre_estado AS state,
         ci.id_ciudad AS city_id,
         ci.nombre_ciudad AS city,
         c.tipo_asentamiento AS settlement_type,
         c.zona AS zone
       FROM usuarios_codigos_postales AS cp
       INNER JOIN usuarios_municipios AS m ON m.id_municipio = cp.id_municipio
       INNER JOIN usuarios_estados AS e ON e.id_estado = m.id_estado
       INNER JOIN usuarios_colonias AS c ON c.id_codigo_postal = cp.id_codigo_postal
       INNER JOIN usuarios_ciudades AS ci ON ci.id_ciudad = c.id_ciudad
       WHERE cp.codigo_postal = :postalCode
       ORDER BY c.nombre_colonia`,
      {
        replacements: { postalCode: Number(postalCode) },
        type: QueryTypes.SELECT,
      },
    );
  }

  /**
   * Guarda el perfil ampliado de FOMAQRO en la tabla heredada.
   *
   * Guarda el UUID de la cuenta en `account_user_id`. La columna `user_id`
   * conserva identificadores numéricos heredados de WordPress y no admite UUID.
   */
  async createRegistrationProfile(
    values: Record<string, unknown>,
    transaction: Transaction,
  ): Promise<void> {
    await database.query(
      `INSERT INTO usuarios_fomaqro_registros (
         account_user_id, user_login, user_email, fomaqro_member, rfc,
         region_id, region_nombre, municipio_id, municipio,
         estado_id, estado, rfc_status, becas_correo, origen,
         creado_en, actualizado_en, codigo_postal, colonia
       ) VALUES (
         :userId, :username, :email, :fomaqroMember, :rfc,
         :regionId, :regionName, :municipalityCode, :municipality,
         :stateCode, :state, :rfcStatus, :email, :origin,
         :createdAt, :updatedAt, :postalCode, :colony
       )`,
      {
        replacements: values,
        transaction,
      },
    );
  }

  /**
   * Sella la fecha del último acceso.
   *
   * Corre fuera de transacción y sin comprobar el resultado: si fallara, el
   * inicio de sesión continúa igual. Es deliberado — no conviene negar el acceso
   * por no poder escribir una marca de tiempo.
   */
  async markLogin(id: string): Promise<void> {
    await SoaUsers.update(
      { last_login_at: new Date(), updated_at: new Date() },
      { where: { id } },
    );
  }

  /**
   * Gets the user data for profile purposes.
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
}

/** Instancia única usada por el servicio. */
export default new AuthRepository();
