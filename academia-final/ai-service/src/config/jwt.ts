/**
 * @file Firma y verificacion de los JWT del servicio.
 *
 * Los seis servicios comparten este archivo y el mismo `JWT_SECRET`, de modo
 * que un token emitido por cualquiera es valido en todos. Es lo que permite que
 * el gateway reenvie la peticion sin volver a autenticar.
 *
 * @see config/env.ts            Secreto y vigencia.
 * @see middlewares/auth.middleware.ts Consumidor de `verifyToken`.
 */

import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import env from '#config/env';

/**
 * Firma un token con el secreto y la vigencia configurados (8 h por defecto).
 *
 * Lo que se meta en el payload viaja al cliente: va firmado, no cifrado, y
 * cualquiera puede leerlo decodificando en base64. No incluir datos sensibles.
 */
export const signToken = (payload: Record<string, unknown>): string =>
  jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });

/**
 * Verifica firma y vigencia, y devuelve el payload.
 *
 * Lanza si el token es invalido o expiro; no devuelve `null`. El middleware de
 * autenticacion captura esa excepcion y la traduce a 401.
 */
export const verifyToken = (token: string): string | JwtPayload =>
  jwt.verify(token, env.jwtSecret);
