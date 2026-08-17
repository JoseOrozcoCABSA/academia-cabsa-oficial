/**
 * @file Guardián de los routers de entidad del CRUD genérico.
 *
 * Los routers de entidad (`users.routes.ts`, `roles.routes.ts`, …) se generan
 * por plantilla y montan la misma tríada genérica que `/api/data/:resource`,
 * pero fijada a una tabla. Durante mucho tiempo se montaron **sin ningún
 * middleware**, mientras que `/data` sí exigía rol administrativo: el mismo CRUD
 * quedaba abierto por una puerta y cerrado por la otra.
 *
 * El gateway comprueba **identidad, no permisos** —así está documentado en
 * `api-gateway/src/middlewares/auth.middleware.ts`—, de modo que sin este
 * guardián cualquier portador de un token válido, incluido un alumno recién
 * registrado, alcanzaba el CRUD completo de `usuarios_cuentas`.
 *
 * Hay dos niveles porque no todas las tablas son iguales:
 *
 * - {@link requireAdministrator} para las tablas sensibles: ni lectura.
 * - {@link guardEntityWrites} para el catálogo educativo, cuyas lecturas el
 *   gateway declara públicas a propósito; sólo se cierran las escrituras.
 *
 * @see auth.middleware.ts Verifica la firma del token.
 * @see role.middleware.ts Compara el rol contra la lista admitida.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import authMiddleware from './auth.middleware.js';
import { allowRoles } from './role.middleware.js';

/**
 * Roles con permiso sobre el CRUD genérico.
 *
 * Es la misma lista que aplica `resources.routes.ts` a `/api/data/:resource`;
 * ambas superficies deben exigir lo mismo, porque son el mismo CRUD.
 */
export const ADMINISTRATIVE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'administrator'];

/** Métodos que no modifican estado. */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const allowAdministrative = allowRoles(...ADMINISTRATIVE_ROLES);

/**
 * Encadena token y rol administrativo.
 *
 * Se compone a mano en vez de pasar los dos middlewares por separado para poder
 * reutilizar la pareja dentro de {@link guardEntityWrites}, que necesita
 * decidir antes si llega a aplicarlos.
 */
export const requireAdministrator: RequestHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  authMiddleware(request, response, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }
    allowAdministrative(request, response, next);
  });
};

/**
 * Deja pasar las lecturas y exige rol administrativo para escribir.
 *
 * Para el catálogo educativo —cursos, lecciones, cápsulas, materiales—, cuyas
 * lecturas el gateway publica sin token de forma deliberada. Cerrarlas rompería
 * el catálogo público; dejar abiertas las escrituras permitía que cualquiera
 * alterase o borrara el contenido.
 */
export const guardEntityWrites: RequestHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (READ_METHODS.has(request.method)) {
    next();
    return;
  }
  requireAdministrator(request, response, next);
};
