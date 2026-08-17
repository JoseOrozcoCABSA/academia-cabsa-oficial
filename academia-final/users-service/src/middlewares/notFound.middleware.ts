/**
 * @file Respuesta 404 para rutas no declaradas.
 *
 * Se registra despues de todas las rutas y antes del manejador de errores.
 */

import type { Request, Response } from 'express';

/**
 * Responde 404 `ROUTE_NOT_FOUND` incluyendo la ruta solicitada.
 *
 * Devolver la ruta ayuda a depurar, pero tambien confirma a un tercero que
 * caminos no existen. Es informacion menor; tenerlo presente si el servicio
 * queda expuesto a internet.
 */
export default function notFoundMiddleware(
  request: Request,
  response: Response,
): void {
  response.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Ruta no encontrada: ${request.path}`,
    },
  });
}
