import { Router } from 'express';
import controller from '#controllers/advisor-management.controller';
import authMiddleware from '#middlewares/auth.middleware';
import { allowRoles } from '#middlewares/role.middleware';

const router = Router();
router.use(authMiddleware);
router.get('/', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'), controller.list);
router.post('/', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'), controller.create);
router.patch('/:id/status', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'), controller.setStatus);
router.put('/:id', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'), controller.update);
router.get('/workspace/current', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator', 'ADVISOR', 'ASESOR', 'advisor'), controller.workspace);
router.post('/groups', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator', 'ADVISOR', 'ASESOR', 'advisor'), controller.createGroup);
router.post('/users', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator', 'ADVISOR', 'ASESOR', 'advisor'), controller.createUser);
router.put('/users/:id', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator', 'ADVISOR', 'ASESOR', 'advisor'), controller.updateUser);
router.patch('/users/:id/status', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator', 'ADVISOR', 'ASESOR', 'advisor'), controller.setUserStatus);
router.get('/profile', allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator', 'ADVISOR', 'ASESOR', 'advisor'), controller.profile);
export default router;
