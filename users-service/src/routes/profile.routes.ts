/**
 * @file Rutas de `profile`.
 *
 * 3 rutas declaradas.
 * `router.use(authMiddleware)` se aplica a todas: no hay ninguna abierta.
 * Los permisos por rol, si hacen falta, se añaden por ruta.
 *
 * ```http
 * GET    /
 * PATCH  /
 * PATCH  /password
 * ```
 *
 * @see ../controllers/profile.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/profile.controller';
import teacherGroupsController from '#controllers/teacher-groups.controller';
import authMiddleware from '#middlewares/auth.middleware';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();
router.use(authMiddleware);
router.get('/', controller.show);
router.patch('/', controller.update);
router.patch('/password', controller.updatePassword);
router.get('/group', teacherGroupsController.overview);
router.get('/group/students/:studentId/progress', teacherGroupsController.studentProgress);
router.post('/group/students', teacherGroupsController.createStudent);
router.patch('/group/students/:studentId', teacherGroupsController.updateStudent);
router.patch('/group/students/:studentId/status', teacherGroupsController.setStudentStatus);
router.delete('/group/students/:studentId', teacherGroupsController.removeStudent);
router.post('/group/students/:studentId/restore', teacherGroupsController.restoreStudent);
router.post('/group/students/:studentId/scholarship', teacherGroupsController.assignStudentScholarship);
router.post('/scholarship/activate', teacherGroupsController.activateScholarship);
router.delete('/scholarship', teacherGroupsController.cancelScholarship);

/** Router listo para montar. */
export default router;
