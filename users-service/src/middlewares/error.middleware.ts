/**
 * @file Manejador central de errores. Único punto donde un error se convierte
 * en respuesta HTTP.
 *
 * Debe registrarse al final de la cadena, despues de las rutas.
 *
 * @see utils/errors.ts AppError, la forma esperada de los errores de dominio.
 */

import type { NextFunction, Request, Response } from 'express';
import logger from '#config/logger';

/** Error con los campos que aporta `AppError`, ambos opcionales. */
interface HttpError extends Error {
  status?: number;
  code?: string;
}

/**
 * Serializa el error como `{ success: false, error: { code, message } }`.
 *
 * Deduce el codigo HTTP en este orden: el `status` del error; 400 si el nombre
 * empieza por `Sequelize` (violacion de constraint, tipo invalido); 500 en el
 * resto.
 *
 * Los errores 500 se registran completos, pero el cliente recibe un mensaje
 * generico para no filtrar detalles internos.
 */
export default function errorMiddleware(
  error: HttpError,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const status = error.status ?? (error.name?.startsWith('Sequelize') ? 400 : 500);
  logger.error(error.message ?? 'Error interno', {
    status,
    stack: error.stack,
  });
  response.status(status).json({
    success: false,
    error: {
      code: error.code ?? (status === 400 ? 'INVALID_DATA' : 'INTERNAL_ERROR'),
      message: status < 500
        ? error.message
        : 'Error interno del servicio',
    },
  });
}
