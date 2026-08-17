/**
 * @file Prefijo de gateway a servicio destino.
 *
 * Se usa `router.use` y no `router.get/post`: eso hace que **todo** el subárbol
 * de cada prefijo se reenvíe, con cualquier verbo y cualquier ruta interna, sin
 * tener que declararlas aquí. El gateway no conoce los endpoints de los
 * servicios y no hay que tocarlo cuando se añade uno nuevo.
 *
 * Consecuencia: el gateway tampoco puede aplicar permisos por endpoint. La
 * autorización de grano fino queda en cada servicio.
 *
 * @see config/services.ts Destinos y URLs.
 */

import { Router } from 'express';
import controller from '#controllers/gateway.controller';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();

router.use('/academia', controller.forward('academia'));
router.use('/ai', controller.forward('ai'));
router.use('/content', controller.forward('content'));
router.use('/analytics', controller.forward('analytics'));
router.use('/users', controller.forward('users'));
router.use('/notifications', controller.forward('notifications'));

/** Router listo para montar. */
export default router;
