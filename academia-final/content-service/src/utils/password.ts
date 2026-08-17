/**
 * @file Cifrado y verificación de contraseñas con bcrypt.
 */

import bcrypt from 'bcryptjs';

/**
 * Cifra una contraseña con 12 rondas de bcrypt.
 *
 * El coste va embebido en el hash resultante, así que subirlo no invalida los
 * hashes ya guardados: `verifyPassword` sigue validándolos con el coste con el
 * que se crearon. Sólo encarece los nuevos.
 */
export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, 12);

/**
 * Compara una contraseña en claro con su hash.
 *
 * `bcrypt.compare` es de tiempo constante, lo que evita filtrar información por
 * el tiempo de respuesta.
 */
export const verifyPassword = (
  password: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(password, hash);
