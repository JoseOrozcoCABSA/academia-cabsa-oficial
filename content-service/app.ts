/**
 * @file Aplicación Express de `content-service`: middlewares y montaje de rutas.
 *
 * No abre el puerto; eso lo hace `server.ts`. Separarlo permite importar la
 * aplicación en pruebas sin levantar un servidor.
 *
 * Rutas montadas:
 * - `/api`
 * - `/api/materials`
 * - `/api/capsules`
 * - `/api/assets`
 * - `/api/videos`
 * - `/api/documents`
 *
 * El orden importa: la auditoría va antes de las rutas para registrarlas
 * todas, y el manejador de «no encontrado» y el de errores van al final —si
 * se montaran antes, atraparían peticiones válidas.
 *
 * `x-powered-by` se desactiva y `helmet` añade las cabeceras de seguridad.
 * El cuerpo JSON está limitado a 5 MB: un envío mayor se rechaza con 413
 * antes de llegar a ningún controlador.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from '#config/env';
import corsOptions from '#config/cors';
import resourcesRoutes from '#routes/resources.routes';
import materialsRoutes from '#routes/materials.routes';
import capsulesRoutes from '#routes/capsules.routes';
import assetsRoutes from '#routes/assets.routes';
import videosRoutes from '#routes/videos.routes';
import documentsRoutes from '#routes/documents.routes';
import mediaRoutes from '#routes/media.routes';

import auditMiddleware from '#middlewares/audit.middleware';
import notFoundMiddleware from '#middlewares/notFound.middleware';
import errorMiddleware from '#middlewares/error.middleware';
import requireGateway from '#middlewares/gateway-auth.middleware';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(auditMiddleware);

app.get('/health', (_request, response) => {
  response.json({
    service: env.serviceName,
    status: 'ok',
    database: env.database.name,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', requireGateway);
app.use('/api', resourcesRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/capsules', capsulesRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/media', mediaRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
