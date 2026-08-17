/**
 * @file Caso de uso de inicio de sesión.
 *
 * @see session.ts             Arma la respuesta y firma el token.
 * @see #utils/password        Comparación y migración de hashes heredados.
 */

import repository from '#repositories/auth.repository';
import { AppError } from '#utils/errors';
import {
  hashPassword,
  isLegacyPasswordHash,
  verifyPassword,
} from '#utils/password';
import { buildSession, newSessionId } from './session.js';

/**
 * Credenciales de acceso.
 *
 * `identity` acepta correo o nombre de usuario. `remember` **no se usa**: la
 * vigencia del token es siempre la configurada en `JWT_EXPIRES_IN`.
 */
export interface LoginInput {
  identity?: string;
  password?: string;
  remember?: boolean;
}

/**
 * Hash de descarte con el que se compara cuando la cuenta no existe.
 *
 * Sirve para que el tiempo de respuesta sea parecido exista o no la cuenta: sin
 * esto, el caso «no existe» respondería sin ejecutar bcrypt y la diferencia
 * sería medible desde fuera.
 */
const INVALID_PASSWORD_HASH = '$2b$12$oGvBV3vvTV4xwWFiXjH.RukKik7BD0dpCK/Zgggh2APr5mbC.Y8DO';

/** Servicio de acceso con credenciales. */
export class LoginService {
  /**
   * Autentica y emite el token.
   *
   * Devuelve el mismo mensaje para cuenta inexistente y contraseña incorrecta.
   * Aun así, una cuenta que existe pero no está activa responde 403
   * `EMAIL_VERIFICATION_REQUIRED`, un error distinto del 401 de credenciales,
   * de modo que ese caso sí es distinguible desde fuera.
   *
   * Si el hash guardado viene de WordPress o de phpass, se reescribe a bcrypt
   * propio aprovechando que en este punto se tiene la contraseña en claro.
   *
   * @returns `{ user, token }`, con el usuario sin su hash.
   * @throws {AppError} 400 `INVALID_LOGIN` si falta algún campo; 401
   *   `INVALID_CREDENTIALS`; 403 `EMAIL_VERIFICATION_REQUIRED` si falta validar
   *   el correo.
   */
  async login(input: LoginInput) {
    if (!input.identity || !input.password) {
      throw new AppError(
        'Usuario/correo y contraseña son obligatorios',
        400,
        'INVALID_LOGIN',
      );
    }
    const user = await repository.findByIdentity(input.identity.trim());
    if (!user) {
      await verifyPassword(input.password, INVALID_PASSWORD_HASH);
      throw new AppError(
        'El correo, usuario o la contraseña no son correctos',
        401,
        'INVALID_CREDENTIALS',
      );
    }
    const values = user.get({ plain: true }) as Record<string, unknown>;
    const valid = await verifyPassword(
      input.password,
      String(values.password_hash),
    );
    if (!valid) {
      throw new AppError(
        'El correo, usuario o la contraseña no son correctos',
        401,
        'INVALID_CREDENTIALS',
      );
    }
    if (isLegacyPasswordHash(String(values.password_hash))) {
      await repository.updatePassword(
        String(values.id),
        await hashPassword(input.password),
      );
    }
    if (values.status === 'PENDING' && !values.email_verified_at) {
      throw new AppError(
        'Debes verificar tu correo antes de iniciar sesión',
        403,
        'EMAIL_VERIFICATION_REQUIRED',
      );
    }
    if (values.status !== 'ACTIVE') {
      throw new AppError(
        'El correo, usuario o la contraseña no son correctos',
        401,
        'INVALID_CREDENTIALS',
      );
    }
    await repository.markLogin(String(values.id));
    const authorization = await repository.authorizationForUser(String(values.id));
    const sessionId = newSessionId();
    await repository.createSession(sessionId, String(values.id));
    return buildSession(values, authorization, sessionId);
  }
}

/** Instancia única usada por la fachada. */
export default new LoginService();
