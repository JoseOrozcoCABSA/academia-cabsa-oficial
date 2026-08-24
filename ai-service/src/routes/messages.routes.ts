/**
 * @file Rutas de `messages`.
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
 * @see ../controllers/messages.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/messages.controller';
import { requireAdministrator } from '#middlewares/entity-guard.middleware';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();

/**
 * Toda la tabla queda tras rol administrativo, lectura incluida.
 *
 * Es el mismo CRUD generico que `/api/data/:resource`, que ya exigia este rol;
 * este router lo servia sin ninguna comprobacion.
 */
router.use(requireAdministrator);
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
