/**
 * @file Rutas de `dashboard`.
 *
 * 1 rutas declaradas.
 * Ninguna declara middleware de seguridad aquí: la protección
 * depende de dónde las monte `app.ts`.
 *
 * ```http
 * GET    /summary
 * ```
 *
 * @see ../controllers/dashboard.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/dashboard.controller';
import authMiddleware from '#middlewares/auth.middleware';
import { allowRoles } from '#middlewares/role.middleware';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();
router.use(authMiddleware, allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'));
router.get('/summary', controller.summary);
router.get('/public-visitors', controller.publicVisitors);
/** Router listo para montar. */
export default router;
