/**
 * @file Saneado de nombres de archivo subidos.
 */

import { extname } from 'node:path';

/**
 * Deja el nombre con sólo letras, dígitos, guion y guion bajo, conservando la
 * extensión.
 *
 * Es la defensa contra travesía de rutas: al sustituir todo lo demás por `_`,
 * secuencias como `../` o los separadores no sobreviven. La extensión sí se
 * conserva tal cual, así que **no** valida el tipo de archivo; eso lo hace el
 * middleware de subida.
 */
export const safeFileName = (name: string): string =>
  name.replace(extname(name), '').replace(/[^a-zA-Z0-9_-]/g, '_') + extname(name);
