/**
 * @file Aplicación Express de `users-service`: middlewares y montaje de rutas.
 *
 * No abre el puerto; eso lo hace `server.ts`. Separarlo permite importar la
 * aplicación en pruebas sin levantar un servidor.
 *
 * Rutas montadas:
 * - `/api`
 * - `/api/users`
 * - `/api/roles`
 * - `/api/permissions`
 * - `/api/groups`
 * - `/api/geography`
 * - `/api/auth`
 * - `/api/profile`
 *
 * El orden importa: la auditoría va antes de las rutas para registrarlas
 * todas, y el manejador de «no encontrado» y el de errores van al final —si
 * se montaran antes, atraparían peticiones válidas.
 *
 * `x-powered-by` se desactiva y `helmet` añade las cabeceras de seguridad.
 * El cuerpo JSON está limitado a 12 MB para admitir padrones grandes. Un envío
 * mayor se rechaza con 413
 * antes de llegar a ningún controlador.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from '#config/env';
import corsOptions from '#config/cors';
import resourcesRoutes from '#routes/resources.routes';
import usersRoutes from '#routes/users.routes';
import rolesRoutes from '#routes/roles.routes';
import permissionsRoutes from '#routes/permissions.routes';
import groupsRoutes from '#routes/groups.routes';
import geographyRoutes from '#routes/geography.routes';
import authRoutes from '#routes/auth.routes';
import profileRoutes from '#routes/profile.routes';
import scholarshipCodesRoutes from '#routes/scholarship-codes.routes';
import userDashboardRoutes from '#routes/user-dashboard.routes';
import advisorManagementRoutes from '#routes/advisor-management.routes';
import sessionValidationRoutes from '#routes/session-validation.routes';
import auditMiddleware from '#middlewares/audit.middleware';
import notFoundMiddleware from '#middlewares/notFound.middleware';
import errorMiddleware from '#middlewares/error.middleware';
import requireGateway from '#middlewares/gateway-auth.middleware';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '12mb' }));
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

app.use('/internal/session', sessionValidationRoutes);

app.use('/api', requireGateway);
app.use('/api', resourcesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/geography', geographyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/scholarship-codes', scholarshipCodesRoutes);
app.use('/api/user-dashboard', userDashboardRoutes);
app.use('/api/advisors', advisorManagementRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
