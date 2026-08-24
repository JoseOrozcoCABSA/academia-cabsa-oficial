/**
 * @file Identificador de traza para correlacionar gateway, servicios y bitácora.
 */

import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Asigna `request.requestId` y lo devuelve en la cabecera `X-Request-Id`.
 *
 * Reutiliza el que traiga el cliente en `x-request-id` o `x-correlation-id`, y
 * sólo genera un UUID si no viene ninguno. Eso permite seguir una operación que
 * atraviesa varios sistemas.
 *
 * Como se acepta el valor del cliente sin validarlo, un tercero puede fijar el
 * identificador o repetirlo. Es aceptable para trazas, pero no sirve como
 * garantía de unicidad ni para deduplicar peticiones.
 */
export default function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  request.requestId =
    request.header('x-request-id')
    ?? request.header('x-correlation-id')
    ?? randomUUID();
  response.setHeader('X-Request-Id', request.requestId);
  next();
}
