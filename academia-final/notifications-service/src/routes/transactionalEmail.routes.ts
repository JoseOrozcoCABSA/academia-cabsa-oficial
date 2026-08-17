import { Router } from 'express';
import { sendTransactionalEmail } from '#controllers/transactionalEmail.controller';

const router = Router();
router.post('/', sendTransactionalEmail);
export default router;
