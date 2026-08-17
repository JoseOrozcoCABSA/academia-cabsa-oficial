/**
 * @file Politica CORS del servicio.
 *
 * Usa la lista blanca declarada en `CORS_ORIGINS` y no admite cookies.
 */

import type { CorsOptions } from 'cors';
import env from '#config/env';

const corsOptions: CorsOptions = {
  origin: env.corsOrigins,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

export default corsOptions;
