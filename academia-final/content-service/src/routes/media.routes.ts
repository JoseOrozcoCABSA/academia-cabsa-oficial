import { Router } from 'express';
import controller from '#controllers/media.controller';
import upload from '#middlewares/upload.middleware';
import authMiddleware from '#middlewares/auth.middleware';
import { allowRoles } from '#middlewares/role.middleware';

const router = Router();
const administrative = [
  authMiddleware,
  allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'),
];

router.get('/files/:id/:variant', controller.file);
router.get('/', ...administrative, controller.list);
router.post('/upload', ...administrative, upload, controller.upload);
router.get('/:id', ...administrative, controller.find);
router.patch('/:id', ...administrative, controller.update);
router.post('/:id/relations', ...administrative, controller.link);
router.delete('/relations/:relationId', ...administrative, controller.unlink);
router.delete('/:id', ...administrative, controller.remove);

export default router;
