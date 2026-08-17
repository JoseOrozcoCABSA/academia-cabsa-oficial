/**
 * @file Cifrado y verificación de contraseñas con bcrypt.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

const PHPASS_ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const phpassEncode64 = (input: Buffer, count: number): string => {
  let output = '';
  let index = 0;
  do {
    let value = input[index];
    index += 1;
    output += PHPASS_ITOA64[value & 0x3f];
    if (index < count) value |= input[index] << 8;
    output += PHPASS_ITOA64[(value >> 6) & 0x3f];
    if (index >= count) break;
    index += 1;
    if (index < count) value |= input[index] << 16;
    output += PHPASS_ITOA64[(value >> 12) & 0x3f];
    if (index >= count) break;
    index += 1;
    output += PHPASS_ITOA64[(value >> 18) & 0x3f];
  } while (index < count);
  return output;
};

const verifyPortablePhpass = (password: string, storedHash: string): boolean => {
  if (!storedHash.startsWith('$P$') && !storedHash.startsWith('$H$')) return false;
  const countLog2 = PHPASS_ITOA64.indexOf(storedHash[3]);
  if (countLog2 < 7 || countLog2 > 30) return false;
  const salt = storedHash.slice(4, 12);
  if (salt.length !== 8) return false;

  const passwordBytes = Buffer.from(password);
  let digest = createHash('md5')
    .update(Buffer.concat([Buffer.from(salt), passwordBytes]))
    .digest();
  let iterations = 1 << countLog2;
  do {
    digest = createHash('md5')
      .update(Buffer.concat([digest, passwordBytes]))
      .digest();
    iterations -= 1;
  } while (iterations > 0);

  const candidate = `${storedHash.slice(0, 12)}${phpassEncode64(digest, 16)}`;
  const candidateBytes = Buffer.from(candidate);
  const storedBytes = Buffer.from(storedHash);
  return candidateBytes.length === storedBytes.length
    && timingSafeEqual(candidateBytes, storedBytes);
};

const verifyModernWordPress = async (
  password: string,
  storedHash: string,
): Promise<boolean> => {
  if (!storedHash.startsWith('$wp$2')) return false;
  const prehashed = createHmac('sha384', 'wp-sha384')
    .update(password.trim())
    .digest('base64');
  return bcrypt.compare(prehashed, storedHash.slice(3));
};

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
): Promise<boolean> => {
  if (hash.startsWith('$wp$')) return verifyModernWordPress(password, hash);
  if (hash.startsWith('$P$') || hash.startsWith('$H$')) {
    return Promise.resolve(verifyPortablePhpass(password, hash));
  }
  return bcrypt.compare(password, hash);
};

/** Indica si el hash debe convertirse a bcrypt propio tras un acceso exitoso. */
export const isLegacyPasswordHash = (hash: string): boolean =>
  hash.startsWith('$wp$') || hash.startsWith('$P$') || hash.startsWith('$H$');
