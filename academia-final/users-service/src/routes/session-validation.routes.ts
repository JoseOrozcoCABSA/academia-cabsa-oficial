/** @file Ruta interna de revocación y vigencia de sesiones. */
import { Router } from 'express';
import requireGateway from '#middlewares/gateway-auth.middleware';
import validateSession from '#controllers/session-validation.controller';

const router = Router();
router.post('/validate', requireGateway, validateSession);
export default router;
