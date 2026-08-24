/**
 * @file Reglas puras de verificación de correo y restablecimiento de contraseña.
 *
 * Como {@link ../auth/registration-rules.ts}, no hace entrada/salida: valida
 * formas y estados que ya se consultaron. Separarlo permite probar los casos
 * límite —código vencido, intentos agotados, enlace caducado— sin base de datos
 * ni reloj real, pasando las fechas como argumento.
 *
 * @see email-verification.service.ts Consume las reglas de verificación.
 * @see password-reset.service.ts     Consume las reglas de restablecimiento.
 */

import { AppError } from '#utils/errors';
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, normalizeEmail } from './registration-rules.js';

/** Código de verificación: exactamente seis dígitos. */
export const VERIFICATION_CODE_PATTERN = /^\d{6}$/;

/** Token de restablecimiento: 32 bytes en hexadecimal. */
export const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

/** Intentos fallidos admitidos antes de bloquear un código de verificación. */
export const MAX_VERIFICATION_ATTEMPTS = 5;

/** Vigencia de un enlace de restablecimiento, en milisegundos (una hora). */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Espera mínima entre dos envíos de código de verificación, en milisegundos. */
export const VERIFICATION_RESEND_INTERVAL_MS = 60_000;

/** Estado del código de verificación tal como está guardado. */
export interface EmailVerificationRecord {
  user_id: string;
  status: string;
  code_hash: string;
  expires_at: string | Date;
  attempts: number | string;
  sent_at: string | Date;
}

/**
 * Valida el par correo/código que llega del formulario de verificación.
 *
 * Descarta cualquier carácter que no sea dígito del código antes de comprobarlo,
 * de modo que un código pegado con espacios o guiones sigue funcionando.
 *
 * @throws {AppError} 400 `INVALID_EMAIL_VERIFICATION` si alguno no tiene forma válida.
 */
export const assertVerificationRequest = (input: {
  email?: string;
  code?: string;
}): { email: string; code: string } => {
  const email = normalizeEmail(input.email);
  const code = input.code?.replace(/\D/g, '') ?? '';
  if (!email || !EMAIL_PATTERN.test(email) || !VERIFICATION_CODE_PATTERN.test(code)) {
    throw new AppError(
      'Captura el correo y el código de seis dígitos',
      400,
      'INVALID_EMAIL_VERIFICATION',
    );
  }
  return { email, code };
};

/**
 * Comprueba que un código guardado se pueda seguir usando.
 *
 * Verifica que exista, esté pendiente, no haya vencido y le queden intentos.
 * No compara el código en sí: eso lo hace quien conoce el hash.
 *
 * @param now Momento de referencia; se inyecta para poder probar el vencimiento.
 * @throws {AppError} 400 `INVALID_EMAIL_VERIFICATION` si no existe o ya se usó;
 *   410 `EMAIL_VERIFICATION_EXPIRED` si venció; 429 `EMAIL_VERIFICATION_LOCKED`
 *   si se agotaron los intentos.
 */
export const assertVerificationUsable = (
  record: EmailVerificationRecord | null | undefined,
  now: number = Date.now(),
): EmailVerificationRecord => {
  if (!record || record.status !== 'PENDING') {
    throw new AppError(
      'El código no es válido o ya fue utilizado',
      400,
      'INVALID_EMAIL_VERIFICATION',
    );
  }
  if (new Date(record.expires_at).getTime() < now) {
    throw new AppError(
      'El código venció. Solicita uno nuevo',
      410,
      'EMAIL_VERIFICATION_EXPIRED',
    );
  }
  if (Number(record.attempts) >= MAX_VERIFICATION_ATTEMPTS) {
    throw new AppError(
      'Se agotaron los intentos. Solicita un código nuevo',
      429,
      'EMAIL_VERIFICATION_LOCKED',
    );
  }
  return record;
};

/**
 * Indica si todavía no ha pasado el tiempo mínimo para reenviar un código.
 *
 * @param now Momento de referencia; se inyecta para poder probarlo.
 */
export const isWithinResendWindow = (
  record: { sent_at: string | Date } | null | undefined,
  now: number = Date.now(),
): boolean =>
  Boolean(record)
  && now - new Date(record!.sent_at).getTime() < VERIFICATION_RESEND_INTERVAL_MS;

/**
 * Valida los datos de restablecimiento de contraseña.
 *
 * Exige correo con forma válida, token hexadecimal de 64 caracteres, contraseña
 * de al menos ocho caracteres y confirmación coincidente. Todo se comprueba de
 * una vez y con el mismo código de error, para no revelar cuál de las piezas
 * falló.
 *
 * @throws {AppError} 400 `INVALID_PASSWORD_RESET`.
 */
export const assertPasswordResetRequest = (input: {
  email?: string;
  token?: string;
  password?: string;
  passwordConfirmation?: string;
}): { email: string; token: string; password: string } => {
  const email = normalizeEmail(input.email);
  if (
    !email
    || !EMAIL_PATTERN.test(email)
    || !input.token
    || !RESET_TOKEN_PATTERN.test(input.token)
    || !input.password
    || input.password.length < MIN_PASSWORD_LENGTH
    || input.password !== input.passwordConfirmation
  ) {
    throw new AppError(
      'Los datos de restablecimiento no son validos',
      400,
      'INVALID_PASSWORD_RESET',
    );
  }
  return { email, token: input.token, password: input.password };
};

/**
 * Indica si un enlace de restablecimiento ya venció.
 *
 * Un `created_at` que no sea fecha se trata como vencido: si no se puede saber
 * cuándo se emitió, no se puede garantizar que siga vigente.
 *
 * @param now Momento de referencia; se inyecta para poder probarlo.
 */
export const isResetTokenExpired = (
  createdAt: unknown,
  now: number = Date.now(),
): boolean =>
  !(createdAt instanceof Date) || now - createdAt.getTime() > RESET_TOKEN_TTL_MS;

/**
 * Valida un correo suelto, como el del reenvío de código o el de «olvidé mi contraseña».
 *
 * @throws {AppError} 400 `INVALID_EMAIL`.
 */
export const assertEmail = (email: string | undefined, message: string): string => {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    throw new AppError(message, 400, 'INVALID_EMAIL');
  }
  return normalized;
};
