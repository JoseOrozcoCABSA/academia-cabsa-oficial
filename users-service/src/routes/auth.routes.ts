/**
 * @file Rutas de `auth`.
 *
 * 5 rutas declaradas.
 * Ojo: no todas llevan middleware de seguridad — ver el listado.
 *
 * ```http
 * GET    /registration/catalog
 * GET    /registration/postal/:postalCode
 * POST   /register
 * POST   /login
 * GET    /me   [authMiddleware]
 * ```
 *
 * @see ../controllers/auth.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/auth.controller';
import authMiddleware from '#middlewares/auth.middleware';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();
router.get('/registration/catalog', controller.registrationCatalog);
router.get('/registration/postal/:postalCode', controller.postalCode);
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.post('/verify-email', controller.verifyEmail);
router.post('/resend-verification', controller.resendVerification);
router.get('/me', authMiddleware, controller.me);
router.get('/advisor/profile', authMiddleware, controller.advisorProfile);

/** Router listo para montar. */
export default router;
