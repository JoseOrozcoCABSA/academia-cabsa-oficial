/**
 * @file Caso de uso de restablecimiento de contraseña.
 *
 * Las dos mitades del flujo: pedir el enlace y consumirlo. Las reglas de forma y
 * vencimiento están en `credential-rules.ts` y la llamada a notificaciones en el
 * adaptador, así que aquí queda sólo la coordinación.
 *
 * @see credential-rules.ts                Reglas puras del token.
 * @see ../clients/notifications.client.ts Envío del correo.
 */

import { createHash, randomBytes } from 'node:crypto';
import repository from '#repositories/auth.repository';
import env from '#config/env';
import { AppError } from '#utils/errors';
import { hashPassword } from '#utils/password';
import { requestPasswordResetEmail } from '../clients/notifications.client.js';
import {
  assertEmail,
  assertPasswordResetRequest,
  isResetTokenExpired,
} from './credential-rules.js';

/**
 * Tiempo mínimo que tarda la solicitud, en milisegundos.
 *
 * La respuesta se retrasa hasta alcanzarlo para que dure lo mismo exista o no la
 * cuenta. Sin esto, el camino «no existe» —que no guarda token ni manda correo—
 * respondería antes y revelaría qué direcciones están registradas.
 */
const MINIMUM_RESPONSE_MS = 300;

/** Espera mínima entre correos de restablecimiento para una misma cuenta. */
const PASSWORD_RESET_RESEND_INTERVAL_SECONDS = 60;

/** Datos del formulario de restablecimiento. */
export interface ResetPasswordInput {
  email?: string;
  token?: string;
  password?: string;
  passwordConfirmation?: string;
}

/** Servicio de restablecimiento de contraseña. */
export class PasswordResetService {
  /**
   * Solicita el enlace sin revelar si el correo está registrado.
   *
   * Si el envío falla se borra el token recién guardado: dejarlo activo sin que
   * nadie haya recibido el enlace sólo amplía la ventana de ataque.
   *
   * @returns Siempre el mismo mensaje genérico.
   * @throws {AppError} 400 `INVALID_EMAIL` si el correo no tiene forma válida.
   */
  async forgotPassword(input: { email?: string }) {
    const startedAt = Date.now();
    const email = assertEmail(
      input.email,
      'Captura un correo electronico valido',
    );
    const user = await repository.findByEmail(email);
    if (user) {
      const values = user.get({ plain: true }) as Record<string, unknown>;
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const reserved = await repository.reservePasswordResetToken(
        email,
        tokenHash,
        PASSWORD_RESET_RESEND_INTERVAL_SECONDS,
      );
      if (reserved) {
        const resetUrl = new URL('/restablecer', env.frontendUrl);
        resetUrl.searchParams.set('email', email);
        resetUrl.searchParams.set('token', token);
        try {
          await requestPasswordResetEmail({
            email,
            userId: values.id,
            resetUrl: resetUrl.href,
          });
        } catch {
          await repository.deletePasswordResetToken(email);
        }
      }
    }
    const remainingDelay = Math.max(0, MINIMUM_RESPONSE_MS - (Date.now() - startedAt));
    if (remainingDelay) {
      await new Promise((resolve) => setTimeout(resolve, remainingDelay));
    }
    return {
      message: 'Si el correo esta registrado, recibiras instrucciones para restablecer tu contraseña.',
    };
  }

  /**
   * Consume un token de un solo uso y reemplaza la contraseña.
   *
   * Un token vencido se borra al detectarlo, para que un segundo intento con el
   * mismo enlace no vuelva a llegar hasta la comprobación.
   *
   * @returns `{ message }` de confirmación.
   * @throws {AppError} 400 `INVALID_PASSWORD_RESET` si los datos no son válidos,
   *   el enlace venció o la cuenta ya no existe.
   */
  async resetPassword(input: ResetPasswordInput) {
    const { email, token, password } = assertPasswordResetRequest(input);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await repository.findPasswordResetToken(email, tokenHash);
    const expired = isResetTokenExpired(record?.get('created_at'));
    const user = record && !expired ? await repository.findByEmail(email) : null;
    if (!record || expired || !user) {
      if (record) await repository.deletePasswordResetToken(email);
      throw new AppError(
        'El enlace es invalido o ya vencio',
        400,
        'INVALID_PASSWORD_RESET',
      );
    }
    await repository.updatePassword(
      String(user.get('id')),
      await hashPassword(password),
    );
    await repository.deletePasswordResetToken(email);
    return { message: 'Contraseña actualizada. Ya puedes iniciar sesion.' };
  }
}

/** Instancia única usada por la fachada. */
export default new PasswordResetService();
