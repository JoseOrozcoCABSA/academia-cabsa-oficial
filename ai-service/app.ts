/**
 * @file Aplicación Express de `ai-service`: middlewares y montaje de rutas.
 *
 * No abre el puerto; eso lo hace `server.ts`. Separarlo permite importar la
 * aplicación en pruebas sin levantar un servidor.
 *
 * Rutas montadas:
 * - `/api`
 * - `/api/assistants`
 * - `/api/prompts`
 * - `/api/chats`
 * - `/api/messages`
 * - `/api/rag`
 * - `/api/documents`
 * - `/api/qdrant`
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
import assistantsRoutes from '#routes/assistants.routes';
import promptsRoutes from '#routes/prompts.routes';
import chatsRoutes from '#routes/chats.routes';
import messagesRoutes from '#routes/messages.routes';
import ragRoutes from '#routes/rag.routes';
import documentsRoutes from '#routes/documents.routes';
import qdrantRoutes from '#routes/qdrant.routes';
import catalogRoutes from '#routes/catalog.routes';
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
app.use('/api/catalog', catalogRoutes);
app.use('/api/assistants', assistantsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/qdrant', qdrantRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
