/**
 * @file Autorizacion por rol.
 *
 * @see auth.middleware.ts       Debe ejecutarse antes; publica `request.auth`.
 * @see permission.middleware.ts Alternativa de grano fino, por permiso.
 */

import type { NextFunction, Request, Response } from 'express';
import { AppError } from '#utils/errors';

/**
 * Restringe la ruta a los roles indicados.
 *
 * Lee `request.auth.role`, que es un solo rol y no una lista: un usuario con
 * varios roles se evalua unicamente por el que traiga el token. La comparacion
 * es exacta y sensible a mayusculas.
 *
 * Depende de `authMiddleware`. Sin el, `request.auth` viene indefinido y la
 * ruta responde 403 en lugar del 401 que corresponderia.
 *
 * @param roles Roles admitidos, p. ej. `allowRoles('Administrador', 'Tutor')`.
 * @returns Middleware que pasa un {@link AppError} 403 `ROLE_FORBIDDEN` si no
 *   coincide ninguno.
 */
export const allowRoles = (...roles: string[]) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const userRoles = request.auth?.roles
      ?? (request.auth?.role ? [request.auth.role] : []);
    if (!userRoles.some((role) => roles.includes(role))) {
      next(new AppError('Rol no autorizado', 403, 'ROLE_FORBIDDEN'));
      return;
    }
    next();
  };
