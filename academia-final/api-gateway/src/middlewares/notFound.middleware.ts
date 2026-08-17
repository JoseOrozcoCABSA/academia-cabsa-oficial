/**
 * @file Respuesta 404 del gateway para prefijos no enrutados.
 *
 * Distingue dos situaciones que el cliente ve igual: un 404 de aqui significa que
 * el prefijo no corresponde a ningun servicio; un 404 reenviado, que el servicio
 * existe pero la ruta interna no.
 */

import type { Request, Response } from 'express';

/**
 * Responde 404 a las rutas que no corresponden a ningun servicio.
 *
 * Se monta despues de todas las rutas. Un 404 de aqui significa que el prefijo
 * no esta enrutado en el gateway; un 404 del servicio, que la ruta interna no
 * existe.
 */
export default function notFoundMiddleware(
  request: Request,
  response: Response,
): void {
  response.status(404).json({
    success: false,
    error: {
      code: 'GATEWAY_ROUTE_NOT_FOUND',
      message: `Ruta no encontrada: ${request.path}`,
    },
    requestId: request.requestId,
  });
}
