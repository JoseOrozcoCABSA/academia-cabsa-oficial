/**
 * @file Rutas de `gamification`.
 *
 * Rutas de progreso y temporizador declaradas.
 * `router.use(authMiddleware)` se aplica a todas: no hay ninguna abierta.
 * Los permisos por rol, si hacen falta, se añaden por ruta.
 *
 * ```http
 * GET    /capsules
 * POST   /capsules/:capsuleId/complete
 * GET    /courses
 * GET    /courses/:courseId/lessons
 * POST   /courses/:courseId/lessons/:lessonId/complete
 * DELETE /courses/:courseId/lessons/:lessonId/complete
 * GET    /combined
 * ```
 *
 * @see ../controllers/gamification.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/gamification.controller';
import authMiddleware from '#middlewares/auth.middleware';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();
router.use(authMiddleware);
router.get('/capsules', controller.capsules);
router.post('/capsules/:capsuleId/complete', controller.completeCapsule);
router.get('/courses', controller.courses);
router.get('/courses/:courseId/lessons', controller.courseLessons);
router.get('/courses/:courseId/lessons/:lessonId/timer', controller.readingTimerStatus);
router.post('/courses/:courseId/lessons/:lessonId/timer/start', controller.startReadingTimer);
router.post('/courses/:courseId/lessons/:lessonId/timer/heartbeat', controller.heartbeatReadingTimer);
router.post('/courses/:courseId/lessons/:lessonId/timer/pause', controller.pauseReadingTimer);
router.post('/courses/:courseId/lessons/:lessonId/complete', controller.completeLesson);
router.delete('/courses/:courseId/lessons/:lessonId/complete', controller.uncompleteLesson);
router.get('/combined', controller.combined);

/** Router listo para montar. */
export default router;
