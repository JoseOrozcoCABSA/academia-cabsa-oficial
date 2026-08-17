/**
 * @file Manejador de errores del gateway.
 *
 * Ultimo eslabon de la cadena: unifica en JSON tanto los errores propios del
 * gateway como los fallos de conexion con un microservicio caido.
 */

import type { NextFunction, Request, Response } from 'express';
import logger from '#config/logger';
import type { GatewayError } from '#utils/errors';

/**
 * Convierte cualquier error en una respuesta JSON uniforme.
 *
 * Debe registrarse **al final** de la cadena; si se monta antes, Express no le
 * entrega los errores. La firma necesita los cuatro parametros —incluido el
 * `next` sin usar— porque es asi como Express distingue un manejador de errores
 * de un middleware normal.
 */
export default function errorMiddleware(
  error: GatewayError,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const status = error.status ?? 500;
  logger.error(error.message ?? 'Error interno del Gateway', {
    requestId: request.requestId,
    status,
    stack: error.stack,
  });
  response.status(status).json({
    success: false,
    error: {
      code: error.code ?? 'GATEWAY_ERROR',
      message: error.message ?? 'Error interno del Gateway',
      details: error.details,
    },
    requestId: request.requestId,
  });
}
