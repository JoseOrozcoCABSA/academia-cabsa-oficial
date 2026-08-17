/**
 * @file Auditoria de las peticiones que atraviesan el gateway.
 *
 * @see config/logger.ts Destino de las entradas.
 */

import type { NextFunction, Request, Response } from 'express';
import logger from '#config/logger';

/**
 * Registra cada peticion que atraviesa el gateway.
 *
 * Asigna un identificador de peticion y lo deja en `request.requestId`, de forma
 * que la misma llamada se puede seguir en el registro del gateway y en el del
 * microservicio de destino.
 *
 * Anota la respuesta cuando termina, no al recibirla, para poder medir la
 * duracion.
 */
export default function auditMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  response.on('finish', () => {
    logger.audit('gateway_request', {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
      subject: request.auth?.sub,
    });
  });
  next();
}
