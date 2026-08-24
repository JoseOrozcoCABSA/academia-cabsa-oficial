/**
 * @file Pruebas de las reglas de verificación de correo y restablecimiento.
 *
 * El momento de referencia se inyecta en cada caso en lugar de usar el reloj
 * real, de modo que el vencimiento y la ventana de reenvío se comprueban sin
 * esperas ni pruebas intermitentes.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../../utils/errors.js';
import {
  assertEmail,
  assertPasswordResetRequest,
  assertVerificationRequest,
  assertVerificationUsable,
  isResetTokenExpired,
  isWithinResendWindow,
  MAX_VERIFICATION_ATTEMPTS,
  RESET_TOKEN_TTL_MS,
  VERIFICATION_RESEND_INTERVAL_MS,
  type EmailVerificationRecord,
} from './credential-rules.js';

/** Instante fijo de referencia para todas las pruebas con fechas. */
const NOW = new Date('2026-08-04T12:00:00Z').getTime();

/** Token de 64 caracteres hexadecimales, como el que genera el servicio. */
const VALID_TOKEN = 'a'.repeat(64);

/** Registro de verificación vigente; cada prueba altera el campo que le interesa. */
const pendingRecord = (
  overrides: Partial<EmailVerificationRecord> = {},
): EmailVerificationRecord => ({
  user_id: 'u-1',
  status: 'PENDING',
  code_hash: 'hash',
  expires_at: new Date(NOW + 60_000),
  attempts: 0,
  sent_at: new Date(NOW - 120_000),
  ...overrides,
});

/** Ejecuta `fn` y devuelve código y estado del {@link AppError} que lanzó. */
const failureOf = (fn: () => unknown): { code: string; status: number } => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof AppError, 'se esperaba un AppError');
    return { code: error.code, status: error.status };
  }
  return assert.fail('se esperaba que lanzara');
};

describe('assertVerificationRequest', () => {
  it('normaliza el correo y descarta separadores del código', () => {
    assert.deepEqual(
      assertVerificationRequest({ email: ' ANA@CABSA.MX ', code: '123 456' }),
      { email: 'ana@cabsa.mx', code: '123456' },
    );
  });

  it('rechaza un código que no tenga seis dígitos', () => {
    assert.equal(
      failureOf(() => assertVerificationRequest({ email: 'ana@cabsa.mx', code: '12345' })).code,
      'INVALID_EMAIL_VERIFICATION',
    );
  });

  it('rechaza un correo con forma inválida', () => {
    assert.equal(
      failureOf(() => assertVerificationRequest({ email: 'ana', code: '123456' })).code,
      'INVALID_EMAIL_VERIFICATION',
    );
  });
});

describe('assertVerificationUsable', () => {
  it('deja pasar un código vigente y con intentos disponibles', () => {
    const record = pendingRecord();
    assert.equal(assertVerificationUsable(record, NOW), record);
  });

  it('rechaza cuando no hay registro', () => {
    assert.equal(
      failureOf(() => assertVerificationUsable(null, NOW)).code,
      'INVALID_EMAIL_VERIFICATION',
    );
  });

  it('rechaza un código ya utilizado', () => {
    assert.equal(
      failureOf(() => assertVerificationUsable(pendingRecord({ status: 'USED' }), NOW)).code,
      'INVALID_EMAIL_VERIFICATION',
    );
  });

  it('responde 410 cuando el código venció', () => {
    assert.deepEqual(
      failureOf(() =>
        assertVerificationUsable(pendingRecord({ expires_at: new Date(NOW - 1) }), NOW)),
      { code: 'EMAIL_VERIFICATION_EXPIRED', status: 410 },
    );
  });

  it('responde 429 cuando se agotaron los intentos', () => {
    assert.deepEqual(
      failureOf(() =>
        assertVerificationUsable(
          pendingRecord({ attempts: MAX_VERIFICATION_ATTEMPTS }),
          NOW,
        )),
      { code: 'EMAIL_VERIFICATION_LOCKED', status: 429 },
    );
  });

  it('admite el último intento antes del tope', () => {
    const record = pendingRecord({ attempts: MAX_VERIFICATION_ATTEMPTS - 1 });
    assert.equal(assertVerificationUsable(record, NOW), record);
  });

  it('comprueba el vencimiento antes que los intentos', () => {
    assert.equal(
      failureOf(() =>
        assertVerificationUsable(
          pendingRecord({
            expires_at: new Date(NOW - 1),
            attempts: MAX_VERIFICATION_ATTEMPTS,
          }),
          NOW,
        )).code,
      'EMAIL_VERIFICATION_EXPIRED',
    );
  });

  it('acepta los intentos guardados como cadena', () => {
    assert.equal(
      failureOf(() => assertVerificationUsable(pendingRecord({ attempts: '5' }), NOW)).code,
      'EMAIL_VERIFICATION_LOCKED',
    );
  });
});

describe('isWithinResendWindow', () => {
  it('bloquea un reenvío inmediato', () => {
    assert.equal(isWithinResendWindow({ sent_at: new Date(NOW - 1000) }, NOW), true);
  });

  it('permite reenviar pasado el intervalo', () => {
    assert.equal(
      isWithinResendWindow(
        { sent_at: new Date(NOW - VERIFICATION_RESEND_INTERVAL_MS - 1) },
        NOW,
      ),
      false,
    );
  });

  it('permite reenviar cuando no hay envío previo', () => {
    assert.equal(isWithinResendWindow(null, NOW), false);
  });
});

describe('assertPasswordResetRequest', () => {
  const valid = {
    email: 'ana@cabsa.mx',
    token: VALID_TOKEN,
    password: 'contrasena8',
    passwordConfirmation: 'contrasena8',
  };

  it('devuelve los datos normalizados', () => {
    assert.deepEqual(assertPasswordResetRequest({ ...valid, email: ' ANA@CABSA.MX ' }), {
      email: 'ana@cabsa.mx',
      token: VALID_TOKEN,
      password: 'contrasena8',
    });
  });

  it('rechaza un token que no sea hexadecimal de 64', () => {
    assert.equal(
      failureOf(() => assertPasswordResetRequest({ ...valid, token: 'zz' })).code,
      'INVALID_PASSWORD_RESET',
    );
  });

  it('rechaza una contraseña de menos de ocho caracteres', () => {
    assert.equal(
      failureOf(() =>
        assertPasswordResetRequest({
          ...valid,
          password: 'corta7',
          passwordConfirmation: 'corta7',
        })).code,
      'INVALID_PASSWORD_RESET',
    );
  });

  it('usa el mismo código cuando la confirmación no coincide, para no revelar la causa', () => {
    assert.equal(
      failureOf(() =>
        assertPasswordResetRequest({ ...valid, passwordConfirmation: 'otracosa8' })).code,
      'INVALID_PASSWORD_RESET',
    );
  });
});

describe('isResetTokenExpired', () => {
  it('considera vigente un enlace reciente', () => {
    assert.equal(isResetTokenExpired(new Date(NOW - 1000), NOW), false);
  });

  it('considera vencido un enlace pasado su tiempo de vida', () => {
    assert.equal(
      isResetTokenExpired(new Date(NOW - RESET_TOKEN_TTL_MS - 1), NOW),
      true,
    );
  });

  it('trata como vencido lo que no sea una fecha', () => {
    assert.equal(isResetTokenExpired(undefined, NOW), true);
    assert.equal(isResetTokenExpired('2026-08-04', NOW), true);
  });
});

describe('assertEmail', () => {
  it('normaliza el correo válido', () => {
    assert.equal(assertEmail(' ANA@CABSA.MX ', 'mensaje'), 'ana@cabsa.mx');
  });

  it('lanza INVALID_EMAIL con el mensaje recibido', () => {
    const failure = failureOf(() => assertEmail('ana', 'Captura un correo válido'));
    assert.deepEqual(failure, { code: 'INVALID_EMAIL', status: 400 });
  });
});
