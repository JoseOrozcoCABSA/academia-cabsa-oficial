import { createHash, randomInt } from 'node:crypto';
import env from '#config/env';

export const verificationHash = (email: string, code: string): string =>
  createHash('sha256').update(`${email}:${code}:${env.jwtSecret}`).digest('hex');

export const newVerificationCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const accountVerificationUrl = (email: string, code: string): string => {
  const url = new URL('/verificar-cuenta', env.frontendUrl);
  url.searchParams.set('email', email);
  url.searchParams.set('code', code);
  return url.href;
};

export const sendTransactionalEmail = async (body: Record<string, unknown>): Promise<void> => {
  const response = await fetch(`${env.notificationsServiceUrl}/internal/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': env.internalServiceKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`notifications-service HTTP ${response.status}`);
};

