/**
 * @file Rutas de `support`.
 *
 * Las tres rutas exigen autenticacion antes de listar, crear o descargar.
 *
 * ```http
 * GET    /
 * POST   /   [supportUpload]
 * GET    /attachments/:id
 * ```
 *
 * @see ../controllers/support.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/support.controller';
import authMiddleware from '#middlewares/auth.middleware';
import supportUpload from '#middlewares/supportUpload.middleware';
import adminController from '#controllers/support-admin.controller';
import { allowRoles } from '#middlewares/role.middleware';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();

router.use(authMiddleware);
router.get('/admin', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'), adminController.dashboard);
router.patch('/admin/:id', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'), adminController.update);
router.get('/admin/attachments/:id', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'), adminController.attachment);
router.get('/', controller.list);
router.post('/', supportUpload, controller.create);
router.get('/attachments/:id', controller.attachment);

/** Router listo para montar. */
export default router;
