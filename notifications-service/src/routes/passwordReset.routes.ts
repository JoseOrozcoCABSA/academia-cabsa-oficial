import { Router } from 'express';
import { enqueuePasswordReset } from '#controllers/passwordReset.controller';

const router = Router();
router.post('/', enqueuePasswordReset);

export default router;

