/**
 * @file Arranque de `users-service`.
 *
 * Comprueba la conexión a la base **antes** de aceptar peticiones, de modo que
 * una configuración mal puesta falla al arrancar y no en la primera consulta.
 *
 * Escucha únicamente en `127.0.0.1`, así que el servicio no es accesible desde
 * la red: solo el gateway, que corre en la misma máquina, puede alcanzarlo. Es
 * lo que impide saltarse la autenticación del gateway llamando al servicio
 * directamente.
 *
 * @see app.ts Middlewares y rutas.
 */

import app from '#app';
import env from '#config/env';
import database from '#config/database';
import logger from '#config/logger';
import { ensureGroupRosterSchema } from './src/database/group-rosters.schema.js';
import { ensurePlatformSettingsSchema } from './src/database/platform-settings.schema.js';

await database.authenticate();
await ensureGroupRosterSchema();
await ensurePlatformSettingsSchema();
app.listen(env.port, env.bindHost, () => {
  logger.info(`${env.serviceName} listo en http://127.0.0.1:${env.port}`);
});
