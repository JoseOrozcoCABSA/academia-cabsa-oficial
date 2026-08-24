import { Router } from 'express';
import authMiddleware from '#middlewares/auth.middleware';
import { allowRoles } from '#middlewares/role.middleware';
import { aiTracker, capsuleTracker, courseTracker } from '#controllers/trackers.controller';

const router = Router();
router.use(authMiddleware, allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'));
router.get('/ai', aiTracker);
router.get('/capsules', capsuleTracker);
router.get('/courses', courseTracker);
export default router;

