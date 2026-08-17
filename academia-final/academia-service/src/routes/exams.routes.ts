import { Router } from 'express';
import authMiddleware from '#middlewares/auth.middleware';
import { allowRoles } from '#middlewares/role.middleware';
import { adminGet, adminSave, studentGet, submit } from '#controllers/exams.controller';

const router = Router();
const administrators = allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator');
router.get('/admin/lesson/:lessonId', authMiddleware, administrators, adminGet);
router.put('/admin/lesson/:lessonId', authMiddleware, administrators, adminSave);
router.get('/lesson/:lessonId', authMiddleware, studentGet);
router.post('/:examId/submit', authMiddleware, submit);
export default router;

