import { Router } from 'express';
import controller from '#controllers/scholarship-codes.controller';
import authMiddleware from '#middlewares/auth.middleware';
import { allowRoles } from '#middlewares/role.middleware';

const router = Router();
router.use(authMiddleware, allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'));
router.get('/overview', controller.overview);
router.get('/settings/self-cancellation', controller.selfCancellationSetting);
router.patch('/settings/self-cancellation', controller.updateSelfCancellationSetting);
router.get('/profiles', controller.profiles);
router.post('/profiles', controller.createProfile);
router.patch('/profiles/:levelId', controller.updateProfile);
router.get('/codes', controller.list);
router.post('/validate', controller.validate);
router.post('/import', controller.import);
router.patch('/codes/:id', controller.update);
router.delete('/codes/:id', controller.remove);
router.post('/pattern/preview', controller.previewPattern);
router.delete('/pattern', controller.removePattern);
router.get('/group', controller.group);
router.patch('/group/expiry', controller.updateGroupExpiry);
router.patch('/activations/:activationId/expiry', controller.updateUserExpiry);
router.patch('/activations/:activationId/suspension', controller.setActivationSuspended);

export default router;
