/** @file Exige que las rutas públicas del servicio hayan pasado por el gateway. */
import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const validInternalKey = (received: unknown, expected: string | undefined): boolean => {
  if (typeof received !== 'string' || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export default function requireGateway(request: Request, response: Response, next: NextFunction): void {
  if (!validInternalKey(request.header('x-internal-service-key'), process.env.INTERNAL_SERVICE_KEY)) {
    response.status(401).json({ success: false, error: { code: 'GATEWAY_REQUIRED', message: 'Solicitud interna no autorizada' } });
    return;
  }
  next();
}
