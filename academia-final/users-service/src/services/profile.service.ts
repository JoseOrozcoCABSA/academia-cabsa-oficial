/**
 * @file Reglas de negocio del perfil del usuario: consulta, edicion y cambio de
 * contrasena.
 *
 * Nada aqui recibe el identificador del usuario desde la peticion: siempre
 * llega desde el token, resuelto por el controlador. Es lo que impide editar el
 * perfil de otra cuenta.
 *
 * @see repositories/profile.repository.ts Consultas, incluidas las tablas heredadas.
 * @see controllers/profile.controller.ts   Origen del identificador.
 */

import repository from '#repositories/profile.repository';
import platformSettingsRepository from '#repositories/platform-settings.repository';
import authRepository from '#repositories/auth.repository';
import { AppError } from '#utils/errors';
import { hashPassword, verifyPassword } from '#utils/password';

const parsePresentation = (value: string | null) => {
  if (!value) return null;
  try { return JSON.parse(value) as Record<string, unknown>; }
  catch { return { html: value }; }
};

/**
 * Campos editables del perfil.
 *
 * Todos son opcionales en el tipo, pero `displayName` es obligatorio en tiempo
 * de ejecucion. Los demas, si se omiten, **se guardan como nulos**: no es una
 * actualizacion parcial.
 */
interface ProfileUpdateInput {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Datos del cambio de contrasena. Los tres son obligatorios en tiempo de
 * ejecucion; el tipo los deja opcionales porque llegan de un cuerpo sin validar.
 */
interface PasswordUpdateInput {
  currentPassword?: string;
  password?: string;
  passwordConfirmation?: string;
}

/**
 * Normaliza un campo de texto opcional.
 *
 * Recorta y devuelve `null` cuando queda vacio, con lo que **borrar el
 * contenido de un campo lo pone a nulo en la base**. Ese es el comportamiento
 * buscado para vaciar un dato del perfil.
 *
 * @param maxLength Tope de longitud; se comprueba sobre el texto ya recortado.
 * @param field Nombre legible del campo, solo para el mensaje de error.
 * @throws {AppError} 400 `INVALID_PROFILE` si excede el tope.
 */
const optionalText = (
  value: string | undefined,
  maxLength: number,
  field: string,
): string | null => {
  const normalized = value?.trim() ?? '';
  if (normalized.length > maxLength) {
    throw new AppError(
      `${field} no puede exceder ${maxLength} caracteres`,
      400,
      'INVALID_PROFILE',
    );
  }
  return normalized || null;
};

/**
 * Quita el hash de la contrasena del registro antes de devolverlo.
 *
 * Es la garantia de que `password_hash` no sale nunca del servicio: se
 * desestructura y se descarta, en lugar de confiar en que quien llame recuerde
 * omitirlo.
 */
const safeUser = (values: Record<string, unknown>) => {
  const { password_hash: _passwordHash, ...safe } = values;
  return safe;
};

/** Servicio de perfil. */
export class ProfileService {
  /**
   * Carga la cuenta o falla.
   *
   * Centraliza el 404 para que ninguna operacion siga adelante con un usuario
   * inexistente.
   *
   * @throws {AppError} 404 `USER_NOT_FOUND`.
   */
  private async requiredUser(userId: string) {
    const user = await repository.findUserById(userId);
    if (!user) {
      throw new AppError('Cuenta no encontrada', 404, 'USER_NOT_FOUND');
    }
    return user;
  }

  /**
   * Devuelve el perfil junto con la beca y el grupo del usuario.
   *
   * Las dos consultas complementarias van en paralelo, y cada una se resuelve
   * por una via distinta de los datos heredados:
   *
   * - La beca se busca **por correo**, no por identificador. Si el usuario
   *   cambia su correo, deja de encontrarse su beca.
   * - El grupo requiere `legacy_official_user_id`; una cuenta creada solo en el
   *   sistema nuevo no lo tiene y siempre sale sin grupo.
   *
   * `membership` es un objeto construido aqui, no una fila: el estado
   * `ACTIVE`/`INACTIVE` se deduce de que exista o no una beca aprobada, y no se
   * guarda en ningun sitio.
   */
  async getProfile(userId: string) {
    const user = await this.requiredUser(userId);
    const values = user.get({ plain: true }) as Record<string, unknown>;
    const email = String(values.email);
    const officialUserId = values.legacy_official_user_id
      ? Number(values.legacy_official_user_id)
      : null;
    const legacyWpUserId = values.legacy_wp_user_id
      ? Number(values.legacy_wp_user_id)
      : null;
    const [scholarship, currentMembership, suspendedMembership, group, scholarshipSelfCancellation] = await Promise.all([
      repository.findScholarshipByEmail(email),
      repository.findCurrentMembership(userId, legacyWpUserId),
      repository.findSuspendedMembership(userId),
      officialUserId
        ? repository.findGroupByOfficialUserId(officialUserId)
        : Promise.resolve(null),
      platformSettingsRepository.scholarshipSelfCancellationEnabled(),
    ]);

    const membership = currentMembership
      ? { id: currentMembership.id, name: currentMembership.name, description: currentMembership.description, presentation: parsePresentation(currentMembership.presentation_config), status: 'ACTIVE', activatedAt: currentMembership.activated_at }
      : suspendedMembership
      ? { id: suspendedMembership.id, name: suspendedMembership.name, description: suspendedMembership.description, presentation: parsePresentation(suspendedMembership.presentation_config), status: 'SUSPENDED', activatedAt: suspendedMembership.activated_at }
      : scholarship && !values.scholarship_cancelled_at
      ? {
        id: scholarship.beca_id ?? scholarship.id,
        name: scholarship.beca_id ? `Beca CABSA #${scholarship.beca_id}` : 'Beca Academia CABSA',
        status: 'ACTIVE',
        activatedAt: scholarship.validated_at,
      }
      : { id: null, name: 'Sin beca activa', status: 'INACTIVE', activatedAt: null };
    const [pageAccess, resourceAccess] = await Promise.all([
      repository.membershipPageAccess(membership.id ? Number(membership.id) : null),
      repository.membershipResourceAccess(membership.id ? Number(membership.id) : null),
    ]);
    return {
      user: safeUser(values),
      membership,
      access: {
        levelId: membership.id ? Number(membership.id) : null,
        sections: Object.fromEntries(pageAccess.map((row) => [row.code, Boolean(row.allowed)])),
        resources: resourceAccess.reduce<Record<string, Record<string, boolean>>>((all, row) => {
          all[row.type] ||= {};
          all[row.type][String(row.resource_key)] = Boolean(row.allowed);
          return all;
        }, {}),
      },
      group,
      features: { scholarshipSelfCancellation },
    };
  }

  /**
   * Actualiza los datos del perfil y devuelve el perfil ya recargado.
   *
   * Cuidado, se comporta como un reemplazo y no como una modificacion parcial:
   * los campos opcionales que no vengan en la peticion **se ponen a nulo**. Un
   * cliente que envie solo `displayName` borra el telefono y los apellidos.
   *
   * @throws {AppError} 400 `INVALID_PROFILE` si falta el nombre visible o
   *   alguno de los textos excede su tope; 404 `USER_NOT_FOUND`.
   */
  async updateProfile(userId: string, input: ProfileUpdateInput) {
    await this.requiredUser(userId);
    const displayName = input.displayName?.trim();
    if (!displayName) {
      throw new AppError(
        'El nombre visible es obligatorio',
        400,
        'INVALID_PROFILE',
      );
    }
    if (displayName.length > 255) {
      throw new AppError(
        'El nombre visible no puede exceder 255 caracteres',
        400,
        'INVALID_PROFILE',
      );
    }

    await repository.updateUser(userId, {
      display_name: displayName,
      first_name: optionalText(input.firstName, 120, 'El nombre'),
      last_name: optionalText(input.lastName, 160, 'Los apellidos'),
      phone: optionalText(input.phone, 30, 'El teléfono'),
      updated_at: new Date(),
    });
    return this.getProfile(userId);
  }

  /**
   * Cambia la contrasena comprobando antes la actual.
   *
   * Las validaciones corren en este orden, y la primera que falle corta: campos
   * presentes, longitud minima de 8, coincidencia con la confirmacion y, por
   * ultimo, que la contrasena actual sea correcta. Esa ultima comprobacion es
   * la unica que consulta la base, de modo que un formulario mal rellenado no
   * llega a hacer trabajo de mas.
   *
   * Distingue el codigo a proposito: los datos mal formados son 400 y una
   * contrasena actual equivocada es 422, para que el cliente pueda diferenciar
   * «corrige el formulario» de «esa no es tu contrasena».
   *
   * Lo que **no** hace: invalidar las sesiones abiertas. Los tokens emitidos
   * antes del cambio siguen siendo validos hasta que caduquen.
   *
   * @throws {AppError} 400 `INVALID_PASSWORD`; 400
   *   `PASSWORD_CONFIRMATION_MISMATCH`; 422 `CURRENT_PASSWORD_INVALID`.
   */
  async updatePassword(userId: string, input: PasswordUpdateInput) {
    if (!input.currentPassword || !input.password) {
      throw new AppError(
        'La contraseña actual y la nueva contraseña son obligatorias',
        400,
        'INVALID_PASSWORD',
      );
    }
    if (input.password.length < 8) {
      throw new AppError(
        'La nueva contraseña debe tener al menos 8 caracteres',
        400,
        'INVALID_PASSWORD',
      );
    }
    if (input.password !== input.passwordConfirmation) {
      throw new AppError(
        'La confirmación de contraseña no coincide',
        400,
        'PASSWORD_CONFIRMATION_MISMATCH',
      );
    }

    const user = await this.requiredUser(userId);
    const values = user.get({ plain: true }) as Record<string, unknown>;
    const valid = await verifyPassword(
      input.currentPassword,
      String(values.password_hash),
    );
    if (!valid) {
      throw new AppError(
        'La contraseña actual no es correcta',
        422,
        'CURRENT_PASSWORD_INVALID',
      );
    }

    await repository.updateUser(userId, {
      password_hash: await hashPassword(input.password),
      updated_at: new Date(),
    });
    await authRepository.revokeSessions(userId);
    return { updated: true };
  }
}

/** Instancia de `ProfileService` lista para usar. */
export default new ProfileService();
