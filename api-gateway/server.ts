/**
 * @file Arranque del proceso del gateway.
 *
 * Escucha **sólo en 127.0.0.1**, así que no acepta conexiones externas: se
 * asume un proxy delante (nginx, IIS) que termina TLS y reenvía. Para exponerlo
 * directamente habría que cambiar la interfaz a `0.0.0.0`.
 */

import app from '#app';
import env from '#config/env';
import logger from '#config/logger';

app.listen(env.port, env.bindHost, () => {
  logger.info(`${env.gatewayName} listo en http://${env.bindHost}:${env.port}`);
});
