/**
 * @file Rutas de `qdrant`.
 *
 * 2 rutas declaradas.
 * Ninguna declara middleware de seguridad aquí: la protección
 * depende de dónde las monte `app.ts`.
 *
 * ```http
 * GET    /health
 * GET    /collections
 * ```
 *
 * @see ../controllers/qdrant.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/qdrant.controller';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();
router.get('/health', controller.health);
router.get('/collections', controller.collections);
/** Router listo para montar. */
export default router;
