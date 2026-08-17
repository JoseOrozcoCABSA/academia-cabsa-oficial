/**
 * @file Caso de uso de verificación del correo de una cuenta nueva.
 *
 * Cubre las dos operaciones del flujo: confirmar el código recibido y pedir uno
 * nuevo. Las reglas de forma, vencimiento e intentos viven en
 * `credential-rules.ts`; aquí sólo queda la coordinación con el repositorio y el
 * envío del correo.
 *
 * @see credential-rules.ts           Reglas puras del código.
 * @see ../account-verification.service.ts Generación de código, hash y correo.
 */

import repository from '#repositories/auth.repository';
import { AppError } from '#utils/errors';
import {
  accountVerificationUrl,
  newVerificationCode,
  sendTransactionalEmail,
  verificationHash,
} from '../account-verification.service.js';
import {
  MAX_VERIFICATION_ATTEMPTS,
  assertEmail,
  assertVerificationRequest,
  assertVerificationUsable,
  isWithinResendWindow,
} from './credential-rules.js';
import { buildSession, newSessionId } from './session.js';

/** Servicio de verificación de correo. */
export class EmailVerificationService {
  /**
   * Confirma el código y deja la cuenta activa, devolviendo ya la sesión.
   *
   * El código se vuelve a leer dentro de la transacción y se compara con el que
   * se validó fuera: si entre ambos momentos se emitió uno nuevo, se rechaza la
   * operación en lugar de activar la cuenta con un código ya sustituido.
   *
   * Un código incorrecto suma un intento; agotarlos bloquea el código y obliga a
   * pedir otro.
   *
   * @returns `{ message, user, token }`, con sesión iniciada.
   * @throws {AppError} 400 `INVALID_EMAIL_VERIFICATION`; 410
   *   `EMAIL_VERIFICATION_EXPIRED`; 429 `EMAIL_VERIFICATION_LOCKED`; 409
   *   `EMAIL_VERIFICATION_CHANGED`; 404 `USER_NOT_FOUND`.
   */
  async verifyEmail(input: { email?: string; code?: string }) {
    const { email, code } = assertVerificationRequest(input);
    // Se comprueba primero para poder distinguir «no existe», «ya se usó» y
    // «venció», que son errores distintos con códigos HTTP distintos.
    const initial = assertVerificationUsable(
      await repository.emailVerificationByEmail(email),
    );
    // El intento se reserva de forma atómica antes de comparar el código. Si
    // sólo se incrementara al fallar, N peticiones simultáneas leerían el mismo
    // contador y todas pasarían el tope: el límite dejaría de existir justo
    // donde importa, que es adivinar un código de seis dígitos.
    if (!await repository.consumeEmailVerificationAttempt(
      email,
      MAX_VERIFICATION_ATTEMPTS,
    )) {
      throw new AppError(
        'Se agotaron los intentos. Solicita un código nuevo',
        429,
        'EMAIL_VERIFICATION_LOCKED',
      );
    }
    if (initial.code_hash !== verificationHash(email, code)) {
      throw new AppError(
        'El código no es correcto',
        400,
        'INVALID_EMAIL_VERIFICATION',
      );
    }
    const userId = await repository.transaction(async (transaction) => {
      const record = await repository.emailVerificationByEmail(email, transaction);
      if (!record || record.code_hash !== initial.code_hash) {
        throw new AppError(
          'El código cambió. Usa el correo más reciente',
          409,
          'EMAIL_VERIFICATION_CHANGED',
        );
      }
      await repository.activateVerifiedEmail(record.user_id, transaction);
      return record.user_id;
    });
    const user = await repository.findByEmail(email);
    if (!user) throw new AppError('Cuenta no encontrada', 404, 'USER_NOT_FOUND');
    const values = user.get({ plain: true }) as Record<string, unknown>;
    const authorization = await repository.authorizationForUser(userId);
    const sessionId = newSessionId();
    await repository.createSession(sessionId, userId);
    return {
      message: 'Correo verificado. Tu cuenta ya está activa.',
      ...buildSession({ ...values, id: userId, email }, authorization, sessionId),
    };
  }

  /**
   * Reenvía el código de verificación.
   *
   * Responde lo mismo exista o no una cuenta pendiente con ese correo, para no
   * revelar qué direcciones están registradas. La única respuesta distinta es el
   * 429 por pedir otro código antes de que pase un minuto, que sí delata que la
   * cuenta existe pero protege del uso del envío como amplificador de correo.
   *
   * @returns `{ message }` siempre genérico.
   * @throws {AppError} 400 `INVALID_EMAIL`; 429 `VERIFICATION_RESEND_LIMIT`.
   */
  async resendEmailVerification(input: { email?: string }) {
    const email = assertEmail(input.email, 'Captura un correo electrónico válido');
    const user = await repository.findByEmail(email);
    if (!user || user.get('status') !== 'PENDING') {
      return { message: 'Si la cuenta está pendiente, enviaremos un código nuevo.' };
    }
    if (isWithinResendWindow(await repository.emailVerificationByEmail(email))) {
      throw new AppError(
        'Espera un minuto antes de solicitar otro código',
        429,
        'VERIFICATION_RESEND_LIMIT',
      );
    }
    const code = newVerificationCode();
    await repository.saveEmailVerification(
      String(user.get('id')),
      verificationHash(email, code),
    );
    await sendTransactionalEmail({
      kind: 'ACCOUNT_VERIFICATION',
      email,
      displayName: String(user.get('display_name')),
      code,
      verificationUrl: accountVerificationUrl(email, code),
    });
    return { message: 'Enviamos un código nuevo. Revisa también correo no deseado.' };
  }
}

/** Instancia única usada por la fachada. */
export default new EmailVerificationService();
