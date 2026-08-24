/**
 * @file Bitacora de auditoria de peticiones HTTP.
 */

import type { NextFunction, Request, Response } from 'express';
import logger from '#config/logger';

/**
 * Registra metodo, ruta, codigo de respuesta y duracion de cada peticion.
 *
 * Escribe al cerrarse la respuesta (evento `finish`), no al recibirla, para
 * poder incluir el estado y el tiempo. Consecuencia: una peticion que nunca
 * termina, por conexion abortada, no deja rastro.
 *
 * Registra `originalUrl`, que incluye la query string: si algun endpoint recibe
 * datos sensibles por query, quedaran en la bitacora.
 */
export default function auditMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  response.on('finish', () => {
    logger.audit('http_request', {
      method: request.method,
      path: request.originalUrl,
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
}
