/**
 * @file Politica CORS del gateway.
 *
 * Solo acepta los origenes declarados en `CORS_ORIGINS`. La sesion viaja en la
 * cabecera `Authorization`, por lo que no se habilitan credenciales CORS.
 *
 * `X-Request-Id` se admite en la entrada y se expone en la salida, lo que permite
 * al cliente correlacionar su peticion con el registro del servidor.
 */

import type { CorsOptions } from 'cors';
import env from '#config/env';

const corsOptions: CorsOptions = {
  origin: env.corsOrigins,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Request-Id',
    'X-Correlation-Id',
  ],
  exposedHeaders: ['X-Request-Id', 'X-Gateway-Service'],
};

export default corsOptions;
