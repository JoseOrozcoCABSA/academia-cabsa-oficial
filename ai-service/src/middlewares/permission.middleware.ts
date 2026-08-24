/**
 * @file Middleware de autorización por permiso concreto.
 *
 * Segundo eslabón de la cadena de seguridad: se monta después de
 * `authMiddleware` y comprueba que el token traiga el permiso exigido por la
 * ruta.
 *
 * @see auth.middleware.ts        Debe ejecutarse antes; publica `request.auth`.
 * @see permissions.controller.ts Administración del catálogo de permisos.
 */

import type { NextFunction, Request, Response } from 'express';
import { AppError } from '#utils/errors';

/**
 * Fábrica de middlewares que exigen un permiso concreto.
 *
 * Comprueba que el permiso esté en la lista `permissions` del token ya
 * verificado, así que **depende de que `authMiddleware` se haya ejecutado
 * antes**: si se monta suelto, `request.auth` viene indefinido y la ruta
 * responde 403 en lugar del 401 que correspondería.
 *
 * La comparación es exacta y sensible a mayúsculas: no admite comodines ni
 * jerarquías, de modo que `usuarios.*` no cubre `usuarios.crear`. Cada permiso
 * debe concederse de forma explícita en la tabla de permisos del rol.
 *
 * ```ts
 * router.post('/', authMiddleware, requirePermission('usuarios.crear'), controller.create);
 * ```
 *
 * @param permission Clave del permiso tal como está registrada en
 *   `usuarios_permisos`.
 * @returns Middleware de Express que continúa si el permiso está presente, o
 *   pasa un {@link AppError} 403 `PERMISSION_FORBIDDEN` si no lo está.
 */
export const requirePermission = (permission: string) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.auth?.permissions?.includes(permission)) {
      next(new AppError('Permiso insuficiente', 403, 'PERMISSION_FORBIDDEN'));
      return;
    }
    next();
  };
