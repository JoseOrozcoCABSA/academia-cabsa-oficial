/**
 * @file Controlador de `certificates`, sobre la tabla `academia_certificados`.
 *
 * Instancia de `ResourcesController` sin comportamiento propio: aporta el
 * capa HTTP con el CRUD completo: listado paginado con filtros, consulta por id, alta, modificación y baja.
 *
 * La tabla queda fijada en la instancia y tiene precedencia sobre cualquier
 * `:resource` que llegue en la URL, de modo que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 *
 * Si esta entidad necesitara reglas propias, el lugar para añadirlas es su
 * servicio, no este archivo.
 *
 * @see controllers/resources.controller.ts Comportamiento heredado.
 */

import type { Request, Response } from 'express';
import service from '#services/certificates.service';
import { ResourcesController } from '#controllers/resources.controller';
import { ok } from '#utils/response';
import { AppError } from '#utils/errors';

/** Lista exclusivamente los certificados del usuario autenticado. */
export const mine = async (request: Request, response: Response): Promise<void> => {
  const userId = request.auth?.sub;
  if (typeof userId !== 'string' || !userId) {
    throw new AppError('Identidad de usuario requerida', 401, 'USER_REQUIRED');
  }
  const result = await service.list(undefined, {
    limit: 100,
    offset: 0,
    orderBy: 'issued_at',
    orderDirection: 'DESC',
    where: { user_id: userId, revoked_at: null },
  });
  ok(response, result.rows);
};

/**
 * Instancia lista para usar, fijada a la tabla `academia_certificados`.
 */
export default new ResourcesController(service, 'academia_certificados');
