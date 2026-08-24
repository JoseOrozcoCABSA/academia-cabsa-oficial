/**
 * @file Aplicación Express de `notifications-service`: middlewares y montaje de rutas.
 *
 * No abre el puerto; eso lo hace `server.ts`. Separarlo permite importar la
 * aplicación en pruebas sin levantar un servidor.
 *
 * Rutas montadas:
 * - `/api`
 * - `/api/templates`
 * - `/api/notifications`
 * - `/api/reminders`
 * - `/api/deliveries`
 * - `/api/email`
 * - `/api/whatsapp`
 * - `/api/support`
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
import templatesRoutes from '#routes/templates.routes';
import notificationsRoutes from '#routes/notifications.routes';
import remindersRoutes from '#routes/reminders.routes';
import deliveriesRoutes from '#routes/deliveries.routes';
import emailRoutes from '#routes/email.routes';
import whatsappRoutes from '#routes/whatsapp.routes';
import supportRoutes from '#routes/support.routes';
import passwordResetRoutes from '#routes/passwordReset.routes';
import transactionalEmailRoutes from '#routes/transactionalEmail.routes';
import bulkEmailRoutes from '#routes/bulkEmail.routes';

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

app.use('/internal/password-reset', passwordResetRoutes);
app.use('/internal/email', transactionalEmailRoutes);
app.use('/api', requireGateway);
app.use('/api', resourcesRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/mail', bulkEmailRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/support', supportRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
