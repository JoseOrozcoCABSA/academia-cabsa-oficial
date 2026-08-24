/**
 * @file Ensamblado del gateway. El orden de los middlewares es el contrato.
 *
 * La cadena, en orden y con el motivo de cada posición:
 *
 * 1. `helmet` y `cors` — cabeceras de seguridad antes que nada.
 * 2. `requestId` — asigna el identificador de traza; va primero para que la
 *    auditoría y los errores ya lo tengan disponible.
 * 3. `audit` — se registra toda petición, incluidas las que después rechacen el
 *    límite de tasa o la autenticación.
 * 4. `express.raw({ type: () => true })` — el cuerpo se deja **en crudo**, como
 *    `Buffer`. Es deliberado y es el contrato que espera el proxy: si se
 *    cambiara por `express.json()`, el reenvío perdería el cuerpo en silencio.
 * 5. Sondas propias (`/health`, `/services`) — antes del límite de tasa y de la
 *    autenticación, para que un monitor pueda consultarlas sin token.
 * 6. `/api` con `rateLimit` → `auth` → rutas de reenvío.
 * 7. `notFound` y `error` — al final, siempre.
 *
 * Nota: el límite de 25 MB del cuerpo debe ir acorde con el de `multer` en los
 * servicios; si aquí fuera menor, las subidas grandes se cortarían en el
 * gateway.
 *
 * @see routes/gateway.routes.ts Prefijo por servicio.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from '#config/env';
import corsOptions from '#config/cors';
import gatewayRoutes from '#routes/gateway.routes';
import gatewayController from '#controllers/gateway.controller';
import requestIdMiddleware from '#middlewares/requestId.middleware';
import rateLimitMiddleware, {
  authRateLimitMiddleware,
  userRateLimitMiddleware,
} from '#middlewares/rateLimit.middleware';
import authMiddleware from '#middlewares/auth.middleware';
import auditMiddleware from '#middlewares/audit.middleware';
import notFoundMiddleware from '#middlewares/notFound.middleware';
import errorMiddleware from '#middlewares/error.middleware';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);
app.use(helmet());
// Las portadas se consumen desde los frontends publicados en puertos u
// orígenes distintos al gateway. Helmet usa `same-origin` por defecto, lo que
// hace que el navegador descarte incluso respuestas 200 válidas. Esta
// excepción se limita al endpoint público de archivos; no cambia CORS ni la
// autenticación del resto de la API.
app.use('/api/content/media/files', (_request, response, next) => {
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use(cors(corsOptions));
app.use(requestIdMiddleware);
app.use(auditMiddleware);
app.use(express.raw({ type: () => true, limit: '25mb' }));

app.get('/health', gatewayController.health);
app.get('/services', gatewayController.catalog);
app.get('/services/health', gatewayController.servicesHealth);

/**
 * Rutas de credenciales, con su propio cubo estrecho por cuenta.
 *
 * Se declaran aparte del reenvío general porque el presupuesto de probar
 * contraseñas no puede ser el mismo que el de navegar el catálogo.
 */
const CREDENTIAL_PATHS = [
  '/api/users/auth/login',
  '/api/users/auth/register',
  '/api/users/auth/forgot-password',
  '/api/users/auth/reset-password',
  '/api/users/auth/verify-email',
  '/api/users/auth/resend-verification',
];
app.use(CREDENTIAL_PATHS, authRateLimitMiddleware);

// El orden importa: el cubo general va por dirección y actúa antes de verificar
// el token; la cuota por persona va después, cuando ya se sabe quién llama.
app.use(
  '/api',
  rateLimitMiddleware,
  authMiddleware,
  userRateLimitMiddleware,
  gatewayRoutes,
);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
