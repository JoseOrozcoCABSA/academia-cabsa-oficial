/**
 * @file Rutas de `documents`.
 *
 * 10 rutas declaradas.
 * Ninguna declara middleware de seguridad aquí: la protección
 * depende de dónde las monte `app.ts`.
 *
 * ```http
 * GET    /record
 * GET    /:id
 * GET    /
 * POST   /
 * PATCH  /:id
 * PUT    /:id
 * PATCH  /
 * PUT    /
 * DELETE /:id
 * DELETE /
 * ```
 *
 * @see ../controllers/documents.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/documents.controller';
import { guardEntityWrites } from '#middlewares/entity-guard.middleware';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();

/**
 * Lectura abierta, escritura solo para rol administrativo.
 *
 * El gateway publica las lecturas de catalogo a proposito; cerrarlas romperia
 * la navegacion sin sesion. Lo que no debia estar abierto era la escritura.
 */
router.use(guardEntityWrites);
router.get('/record', controller.findOne);
router.get('/:id', controller.findById);
router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id', controller.updateById);
router.put('/:id', controller.updateById);
router.patch('/', controller.update);
router.put('/', controller.update);
router.delete('/:id', controller.removeById);
router.delete('/', controller.remove);

/** Router listo para montar. */
export default router;
