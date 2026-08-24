import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import env from '#config/env';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';
import { passwordResetMail, sendMail } from '#services/mailer.service';

const authorized = (candidate: string | undefined): boolean => {
  if (!candidate) return false;
  const expected = Buffer.from(env.internalServiceKey);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

/** Envía inmediatamente el correo de recuperación solicitado por users-service. */
export const enqueuePasswordReset = async (
  request: Request,
  response: Response,
): Promise<void> => {
  if (!authorized(request.header('x-internal-service-key'))) {
    throw new AppError('Servicio no autorizado', 401, 'INTERNAL_UNAUTHORIZED');
  }
  const { email, userId, resetUrl } = request.body as Record<string, unknown>;
  if (
    typeof email !== 'string'
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || typeof userId !== 'string'
    || typeof resetUrl !== 'string'
  ) {
    throw new AppError('Solicitud interna inválida', 400, 'INVALID_INTERNAL_REQUEST');
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(resetUrl);
  } catch {
    throw new AppError('URL de restablecimiento inválida', 400, 'INVALID_RESET_URL');
  }
  if (!env.corsOrigins.includes(parsedUrl.origin)) {
    throw new AppError('Origen de restablecimiento no permitido', 400, 'INVALID_RESET_ORIGIN');
  }
  await sendMail(passwordResetMail(email, parsedUrl.href));
  ok(response, { sent: true }, 202);
};
