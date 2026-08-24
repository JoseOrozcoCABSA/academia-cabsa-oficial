/**
 * @file Formato de fecha para columnas DATETIME de MySQL.
 */

/**
 * Devuelve la fecha actual como `YYYY-MM-DD HH:MM:SS`.
 *
 * Sale de `toISOString`, así que está **en UTC**, no en la zona local del
 * servidor. Si la base de datos espera hora local, los valores quedarán
 * desplazados.
 */
export const nowSql = (): string =>
  new Date().toISOString().slice(0, 19).replace('T', ' ');
