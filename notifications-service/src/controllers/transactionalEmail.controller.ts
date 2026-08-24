import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import env from '#config/env';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';
import { accountVerificationMail, passwordResetMail, scholarshipActivatedMail } from '#services/mailer.service';
import { enqueueMail } from '#services/mailQueue.service';

const authorized = (candidate: string | undefined): boolean => {
  if (!candidate) return false;
  const expected = Buffer.from(env.internalServiceKey);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
};
const validEmail = (value: unknown): value is string =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const sendTransactionalEmail = async (request: Request, response: Response): Promise<void> => {
  if (!authorized(request.header('x-internal-service-key'))) {
    throw new AppError('Servicio no autorizado', 401, 'INTERNAL_UNAUTHORIZED');
  }
  const body = request.body as Record<string, unknown>;
  if (!validEmail(body.email) || typeof body.kind !== 'string') {
    throw new AppError('Solicitud interna inválida', 400, 'INVALID_INTERNAL_REQUEST');
  }
  let message;
  if (body.kind === 'ACCOUNT_VERIFICATION') {
    if (
      typeof body.displayName !== 'string'
      || typeof body.code !== 'string'
      || !/^\d{6}$/.test(body.code)
      || typeof body.verificationUrl !== 'string'
    ) {
      throw new AppError('Código de activación inválido', 400, 'INVALID_ACTIVATION_CODE');
    }
    const verificationUrl = new URL(body.verificationUrl);
    if (!env.corsOrigins.includes(verificationUrl.origin)) {
      throw new AppError('Origen no permitido', 400, 'INVALID_VERIFICATION_ORIGIN');
    }
    message = accountVerificationMail(
      body.email,
      body.displayName,
      body.code,
      verificationUrl.href,
    );
  } else if (body.kind === 'PASSWORD_RESET') {
    if (typeof body.resetUrl !== 'string') throw new AppError('URL inválida', 400, 'INVALID_RESET_URL');
    const parsed = new URL(body.resetUrl);
    if (!env.corsOrigins.includes(parsed.origin)) {
      throw new AppError('Origen no permitido', 400, 'INVALID_RESET_ORIGIN');
    }
    message = passwordResetMail(body.email, parsed.href);
  } else if (body.kind === 'SCHOLARSHIP_ACTIVATED') {
    if (typeof body.displayName !== 'string' || typeof body.membershipName !== 'string') {
      throw new AppError('Datos de beca inválidos', 400, 'INVALID_SCHOLARSHIP_EMAIL');
    }
    message = scholarshipActivatedMail(body.email, body.displayName, body.membershipName, typeof body.expiresAt === 'string' ? body.expiresAt : null);
  } else {
    throw new AppError('Tipo de correo no soportado', 400, 'UNSUPPORTED_EMAIL_KIND');
  }
  const queueId = await enqueueMail(body.kind, message);
  ok(response, { queued: true, queueId }, 202);
};
