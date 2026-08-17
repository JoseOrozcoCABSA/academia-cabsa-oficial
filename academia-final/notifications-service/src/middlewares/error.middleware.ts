/**
 * @file Manejador de errores de `notifications-service`.
 *
 * Acepta errores de dominio y errores inesperados sin filtrar detalles de los
 * fallos internos al cliente.
 */

import type { NextFunction, Request, Response } from 'express';
import logger from '#config/logger';

/**
 * Error con codigo HTTP opcional.
 *
 * Los campos son opcionales porque aqui llega cualquier excepcion, tambien las
 * que no son de dominio: sin `status` se responde 500.
 */
interface HttpError extends Error {
  status?: number;
  code?: string;
}

/**
 * Traduce cualquier error a una respuesta JSON uniforme.
 *
 * Debe registrarse **al final** de la cadena o Express no le entregara los
 * errores. Los cuatro parametros son obligatorios en la firma —incluido el
 * `next` sin usar— porque es asi como Express reconoce un manejador de errores.
 */
export default function errorMiddleware(
  error: HttpError,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const isUploadError = error.name === 'MulterError';
  const status = error.status
    ?? (error.name?.startsWith('Sequelize') || isUploadError ? 400 : 500);
  const clientMessage = isUploadError && error.code === 'LIMIT_FILE_SIZE'
    ? 'Cada imagen debe pesar máximo 5 MB.'
    : isUploadError && error.code === 'LIMIT_FILE_COUNT'
      ? 'Solo puedes adjuntar hasta 3 imágenes.'
      : error.message ?? 'Error interno del servicio';
  const message = status < 500 ? clientMessage : 'Error interno del servicio';
  logger.error(error.message ?? 'Error interno', {
    status,
    stack: error.stack,
  });
  response.status(status).json({
    success: false,
    error: {
      code: error.code ?? (status === 400 ? 'INVALID_DATA' : 'INTERNAL_ERROR'),
      message,
    },
  });
}
