/**
 * @file Rutas de `reports`.
 *
 * 1 rutas declaradas.
 * Ninguna declara middleware de seguridad aquí: la protección
 * depende de dónde las monte `app.ts`.
 *
 * ```http
 * GET    /events
 * ```
 *
 * @see ../controllers/reports.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/reports.controller';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();
router.get('/events', controller.events);
/** Router listo para montar. */
export default router;
