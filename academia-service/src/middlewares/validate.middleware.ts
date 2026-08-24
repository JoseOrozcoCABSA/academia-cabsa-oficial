/**
 * @file Validacion del cuerpo de la peticion antes de llegar al controlador.
 *
 * @see validators/resource.validator.ts Validador incluido.
 */

import type { NextFunction, Request, Response } from 'express';
import { AppError } from '#utils/errors';

/** Veredicto de un validador. `message` solo se usa cuando `valid` es falso. */
interface ValidationResult {
  valid: boolean;
  message?: string;
}

/** Recibe el cuerpo sin tipar y decide si es aceptable. */
type Validator = (payload: unknown) => ValidationResult;

/**
 * Aplica un validador a `request.body` y corta la peticion si falla.
 *
 * Solo valida: no transforma ni sanea, asi que el controlador recibe
 * exactamente lo que envio el cliente.
 *
 * @returns Middleware que pasa un {@link AppError} 400 `VALIDATION_ERROR` con
 *   el mensaje del validador.
 */
export const validateBody = (validator: Validator) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const result = validator(request.body);
    if (!result.valid) {
      next(new AppError(
        result.message ?? 'Datos inválidos',
        400,
        'VALIDATION_ERROR',
      ));
      return;
    }
    next();
  };
