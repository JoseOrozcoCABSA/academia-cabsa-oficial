/**
 * @file Caso de uso de alta de cuentas.
 *
 * Coordina las reglas puras de `registration-rules.ts` con el repositorio: valida
 * primero todo lo que no necesita base de datos, después resuelve la ubicación
 * contra el catálogo, comprueba duplicados y crea la cuenta.
 *
 * La cuenta y su perfil ampliado se crean en una sola transacción. Una cuenta a
 * medias sería inservible: no podría iniciar sesión y tampoco repetir el alta,
 * porque su correo ya figuraría como ocupado.
 *
 * @see registration-rules.ts Validaciones sin entrada/salida.
 */

import { randomUUID } from 'node:crypto';
import repository from '#repositories/auth.repository';
import { AppError } from '#utils/errors';
import { hashPassword } from '#utils/password';
import {
  accountVerificationUrl,
  newVerificationCode,
  sendTransactionalEmail,
  verificationHash,
} from '../account-verification.service.js';
import { publicUser } from './session.js';
import {
  assertAddressRequest,
  assertFomaqroAnswer,
  assertFomaqroMembership,
  assertRegistrationIdentity,
  resolveAddress,
  type RegisterInput,
  type ResolvedLocation,
} from './registration-rules.js';

/** Ubicación vacía, para el caso en que aún no se ha resuelto ninguna. */
const EMPTY_LOCATION: ResolvedLocation = {
  postalCode: null,
  colony: null,
  municipalityCode: null,
  municipality: null,
  stateCode: null,
  state: null,
};

/** Servicio de alta de cuentas. */
export class RegistrationService {
  /**
   * Da de alta una cuenta con todas sus validaciones.
   *
   * Según la respuesta sobre FOMAQRO se piden datos distintos: quien no
   * pertenece aporta código postal y colonia, que se validan contra el catálogo;
   * quien pertenece aporta RFC, región y municipio, que se validan contra las
   * constantes en código.
   *
   * Los códigos de beca no intervienen aquí: se activan más tarde, desde el
   * perfil de una cuenta ya verificada.
   *
   * El correo de verificación se manda fuera de la transacción y su fallo no
   * cancela el alta; se informa con `emailSent` para que el cliente ofrezca
   * reenviarlo.
   *
   * @returns `{ user, requiresEmailVerification, email, emailSent }`.
   * @throws {AppError} 400/422 según la validación que falle; 409
   *   `USER_EXISTS` o `USERNAME_EXISTS` si el correo o el usuario ya existen.
   */
  async register(input: RegisterInput) {
    const identity = assertRegistrationIdentity(input);
    const fomaqroMember = assertFomaqroAnswer(input);

    let location: ResolvedLocation = EMPTY_LOCATION;
    let rfc: string | null = null;
    let regionId: string | null = null;
    let regionName: string | null = null;

    if (fomaqroMember === 'no') {
      const request = assertAddressRequest(input);
      location = resolveAddress(
        await repository.findPostalCode(request.postalCode),
        request.postalCode,
        request.colonyId,
      );
    } else {
      const membership = assertFomaqroMembership(input);
      ({ rfc, regionId, regionName } = membership);
      location = membership;
    }

    const existing = await repository.findExisting(identity.email, identity.username);
    if (existing) {
      const existingValues = existing.get({ plain: true }) as Record<string, unknown>;
      const usernameConflict = String(existingValues.username).toLowerCase() === identity.username;
      throw new AppError(
        usernameConflict
          ? 'El nombre de usuario ya está ocupado'
          : 'Ya existe una cuenta con este correo',
        409,
        usernameConflict ? 'USERNAME_EXISTS' : 'USER_EXISTS',
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(identity.password);
    const user = await repository.transaction(async (transaction) => {
      const created = await repository.create({
        id: randomUUID(),
        email: identity.email,
        username: identity.username,
        password_hash: passwordHash,
        first_name: identity.firstName,
        last_name: identity.lastName,
        display_name: identity.fullName,
        status: 'PENDING',
        email_verified_at: null,
        created_at: now,
        updated_at: now,
      }, transaction);
      await repository.createRegistrationProfile({
        userId: created.get('id'),
        username: identity.username,
        email: identity.email,
        fomaqroMember,
        rfc,
        regionId,
        regionName,
        municipalityCode: location.municipalityCode,
        municipality: location.municipality,
        stateCode: location.stateCode,
        state: location.state,
        rfcStatus: rfc ? 'pending' : 'not_required',
        origin: 'academia-final',
        createdAt: now,
        updatedAt: now,
        postalCode: location.postalCode,
        colony: location.colony,
      }, transaction);
      return created;
    });

    const values = user.get({ plain: true }) as Record<string, unknown>;
    const verificationCode = newVerificationCode();
    await repository.saveEmailVerification(
      String(values.id),
      verificationHash(identity.email, verificationCode),
    );
    let emailSent = true;
    try {
      await sendTransactionalEmail({
        kind: 'ACCOUNT_VERIFICATION',
        email: identity.email,
        displayName: identity.fullName,
        code: verificationCode,
        verificationUrl: accountVerificationUrl(identity.email, verificationCode),
      });
    } catch {
      emailSent = false;
    }
    return {
      user: publicUser(values),
      requiresEmailVerification: true,
      email: identity.email,
      emailSent,
    };
  }
}

/** Instancia única usada por la fachada. */
export default new RegistrationService();
