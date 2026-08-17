/**
 * @file Aplicación Express de `academia-service`: middlewares y montaje de rutas.
 *
 * No abre el puerto; eso lo hace `server.ts`. Separarlo permite importar la
 * aplicación en pruebas sin levantar un servidor.
 *
 * Rutas montadas:
 * - `/api`
 * - `/api/courses`
 * - `/api/lessons`
 * - `/api/enrollments`
 * - `/api/progress`
 * - `/api/certificates`
 * - `/api/memberships`
 * - `/api/support`
 * - `/api/forums`
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
import coursesRoutes from '#routes/courses.routes';
import lessonsRoutes from '#routes/lessons.routes';
import enrollmentsRoutes from '#routes/enrollments.routes';
import progressRoutes from '#routes/progress.routes';
import certificatesRoutes from '#routes/certificates.routes';
import membershipsRoutes from '#routes/memberships.routes';
import supportRoutes from '#routes/support.routes';
import forumsRoutes from '#routes/forums.routes';
import examsRoutes from '#routes/exams.routes';

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
app.use('/api/courses', coursesRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/forums', forumsRoutes);
app.use('/api/exams', examsRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
