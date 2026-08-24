/**
 * @file Construcción de la sesión que se devuelve tras un acceso válido.
 *
 * Lo usan tanto el inicio de sesión como la verificación de correo, que también
 * emite token para que la cuenta recién validada entre sin volver a escribir la
 * contraseña. Tenerlo en un solo sitio evita que ambos flujos se separen y uno
 * acabe filtrando un campo que el otro sí oculta.
 *
 * @see login.service.ts              Acceso con credenciales.
 * @see email-verification.service.ts Alta de la sesión tras validar el correo.
 */

import { signToken } from '#config/jwt';
import { randomUUID } from 'node:crypto';

/** Roles y permisos que el repositorio resuelve para la cuenta. */
export type Authorization = Record<string, unknown>;

/**
 * Quita el hash de la contraseña del registro de usuario.
 *
 * Descarta únicamente `password_hash`. El resto de las columnas se expone tal
 * cual, así que cualquier columna sensible que se añada a la tabla saldrá en la
 * respuesta mientras no se filtre también aquí.
 */
export const publicUser = (
  values: Record<string, unknown>,
): Record<string, unknown> => {
  const { password_hash: _passwordHash, ...safe } = values;
  return safe;
};

/**
 * Arma la respuesta de sesión: usuario público más token firmado.
 *
 * El payload del token lleva identificador, correo, usuario y la autorización.
 * Va firmado pero no cifrado: cualquiera puede leerlo, así que no debe incluir
 * datos sensibles.
 */
export const buildSession = (
  values: Record<string, unknown>,
  authorization: Authorization,
  sessionId: string,
): { user: Record<string, unknown>; token: string } => ({
  user: { ...publicUser(values), ...authorization },
  token: signToken({
    sub: values.id,
    email: values.email,
    username: values.username,
    jti: sessionId,
    ...authorization,
  }),
});

/** Identificador impredecible de una sesión revocable. */
export const newSessionId = (): string => randomUUID();
