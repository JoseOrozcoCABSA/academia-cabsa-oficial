/**
 * @file Normaliza la paginación que llega por query string.
 */

import type { Request } from 'express';

/** Ventana de paginación validada. */
export interface Pagination {
  limit: number;
  offset: number;
}

/**
 * Extrae `limit` y `offset` de la query aplicando topes.
 *
 * `limit` queda acotado entre 1 y **100** —el tope evita que un cliente pida la
 * tabla completa— y por defecto es 25. `offset` nunca es negativo.
 *
 * Un valor no numérico produce `NaN`, y `Math.min`/`Math.max` lo propagan: la
 * consulta fallará en la base de datos en lugar de aquí.
 */
export const paginationFrom = (query: Request['query']): Pagination => ({
  limit: Math.min(Math.max(Number(query.limit ?? 25), 1), 100),
  offset: Math.max(Number(query.offset ?? 0), 0),
});
