/**
 * @file Politica CORS del servicio.
 *
 * Solo acepta los origenes declarados en `CORS_ORIGINS`. La autenticacion usa
 * Bearer tokens y no cookies, por lo que no habilita credenciales CORS.
 */

import type { CorsOptions } from 'cors';
import env from '#config/env';

const corsOptions: CorsOptions = {
  origin: env.corsOrigins,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

export default corsOptions;
