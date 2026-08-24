/**
 * @file Aplicación Express de `analytics-service`: middlewares y montaje de rutas.
 *
 * No abre el puerto; eso lo hace `server.ts`. Separarlo permite importar la
 * aplicación en pruebas sin levantar un servidor.
 *
 * Rutas montadas:
 * - `/api`
 * - `/api/events`
 * - `/api/activeDays`
 * - `/api/streaks`
 * - `/api/dashboard`
 * - `/api/reports`
 * - `/api/learning-progress`
 * - `/api/gamification`
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
import eventsRoutes from '#routes/events.routes';
import activeDaysRoutes from '#routes/activeDays.routes';
import streaksRoutes from '#routes/streaks.routes';
import dashboardRoutes from '#routes/dashboard.routes';
import reportsRoutes from '#routes/reports.routes';
import gamificationRoutes from '#routes/gamification.routes';
import trackersRoutes from '#routes/trackers.routes';
import trackRoutes from '#routes/track.routes';
import auditMiddleware from '#middlewares/audit.middleware';
import notFoundMiddleware from '#middlewares/notFound.middleware';
import errorMiddleware from '#middlewares/error.middleware';
import requireGateway from '#middlewares/gateway-auth.middleware';

const app = express();
app.disable('x-powered-by');
// El servicio sólo es accesible desde el Gateway dentro de la red privada.
app.set('trust proxy', 1);
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
app.use('/api/events', eventsRoutes);
app.use('/api/activeDays', activeDaysRoutes);
app.use('/api/streaks', streaksRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/learning-progress', gamificationRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/trackers', trackersRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
