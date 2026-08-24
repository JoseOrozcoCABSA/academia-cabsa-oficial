/**
 * @file Rutas de `forums`.
 *
 * 11 rutas declaradas.
 * Ninguna declara middleware de seguridad aquí: la protección
 * depende de dónde las monte `app.ts`.
 *
 * ```http
 * GET    /topics/record
 * GET    /topics/:id
 * GET    /topics
 * POST   /topics
 * GET    /replies/record
 * GET    /replies/:id
 * GET    /replies
 * POST   /replies
 * GET    /record
 * GET    /:id
 * GET    /
 * ```
 *
 * @see ../controllers/forums.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import { forumsController as forums, repliesController as replies, topicsController as topics } from '#controllers/forum-resources.controllers';
/** Router de la entidad; se monta en `app.ts`. */
const router = Router();

router.get('/topics/record', topics.findOne);
router.get('/topics/:id', topics.findById);
router.get('/topics', topics.list);
router.post('/topics', topics.create);

router.get('/replies/record', replies.findOne);
router.get('/replies/:id', replies.findById);
router.get('/replies', replies.list);
router.post('/replies', replies.create);

router.get('/record', forums.findOne);
router.get('/:id', forums.findById);
router.get('/', forums.list);

/** Router listo para montar. */
export default router;
