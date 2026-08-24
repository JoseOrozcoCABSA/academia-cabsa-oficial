/**
 * @file Sobre uniforme de respuesta HTTP para todo el servicio.
 *
 * Toda respuesta exitosa sale como `{ success: true, data }`. El middleware de
 * errores produce la forma equivalente para los fallos.
 */

import type { Response } from 'express';

/** Resultado de `findAndCountAll` de Sequelize. */
interface PaginatedResult {
  rows: unknown[];
  /** Número, o arreglo cuando la consulta lleva `group` (Sequelize cambia el tipo). */
  count: number | unknown[];
}

/** Ventana de paginación ya normalizada por `paginationFrom`. */
interface Pagination {
  limit: number;
  offset: number;
}

/**
 * Responde con el sobre estándar.
 *
 * @param status Código HTTP. Usar 201 en las altas.
 */
export const ok = (
  response: Response,
  data: unknown,
  status = 200,
): Response => response.status(status).json({ success: true, data });

/**
 * Responde una página con sus metadatos.
 *
 * Normaliza `count`: Sequelize lo devuelve como arreglo cuando la consulta
 * agrupa, y como número en el resto de los casos.
 *
 * @returns 200 con `{ success, data, pagination: { limit, offset, total } }`.
 */
export const paginated = (
  response: Response,
  result: PaginatedResult,
  pagination: Pagination,
): Response => response.json({
  success: true,
  data: result.rows,
  pagination: {
    ...pagination,
    total: Array.isArray(result.count) ? result.count.length : result.count,
  },
});
