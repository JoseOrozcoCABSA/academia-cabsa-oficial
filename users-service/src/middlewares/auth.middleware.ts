/**
 * @file Middleware de autenticación por JWT.
 *
 * Primer eslabón de la cadena de seguridad de toda ruta protegida: verifica el
 * token y publica su contenido en `request.auth`. Los middlewares de
 * autorización (`permission`, `role`) dan por hecho que este ya se ejecutó.
 *
 * @see config/jwt.ts             Firma y verificación del token.
 * @see permission.middleware.ts  Comprobación de permisos, posterior a esta.
 * @see role.middleware.ts        Comprobación de roles, posterior a esta.
 */

import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '#config/jwt';
import { AppError } from '#utils/errors';

/**
 * Autentica la petición con el JWT del encabezado `Authorization`.
 *
 * Exige el formato `Bearer <token>` (el prefijo no distingue mayúsculas).
 * Si el token es válido, deja su
 * contenido en `request.auth`, de donde lo leen después
 * `requirePermission`, `allowRoles` y los controladores.
 *
 * Cuando el payload es una cadena en lugar de un objeto —caso admitido por la
 * especificación de JWT— se envuelve como `{ subject }` para que
 * `request.auth` tenga siempre la misma forma y quien lo consuma no tenga que
 * comprobar el tipo.
 *
 * Este middleware sólo verifica la firma y la vigencia del token: **no**
 * comprueba permisos ni roles. Encadenar después el middleware correspondiente.
 *
 * Distingue la ausencia (`TOKEN_REQUIRED`) del formato o firma invalidos
 * (`INVALID_TOKEN`).
 *
 * @param request Petición de Express. Se le añade `auth` como efecto.
 * @param next Recibe un {@link AppError} 401 `TOKEN_REQUIRED` si no hay token,
 *   o 401 `INVALID_TOKEN` si la verificación falla.
 */
export default function authMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const authorization = request.headers.authorization;
  if (!authorization) {
    next(new AppError('Token requerido', 401, 'TOKEN_REQUIRED'));
    return;
  }
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    next(new AppError('Token inválido o vencido', 401, 'INVALID_TOKEN'));
    return;
  }
  try {
    const payload = verifyToken(match[1]);
    request.auth = typeof payload === 'string'
      ? { subject: payload }
      : payload;
    next();
  } catch {
    next(new AppError('Token inválido o vencido', 401, 'INVALID_TOKEN'));
  }
}
