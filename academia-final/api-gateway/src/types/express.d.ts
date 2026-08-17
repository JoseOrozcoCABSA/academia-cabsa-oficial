/**
 * @file Amplía el tipo `Request` de Express con los campos que añaden los
 * middlewares del gateway.
 *
 * Sin esta declaración, TypeScript rechazaría `request.requestId` y
 * `request.auth`. Es sólo tipado: no crea los campos, los ponen
 * `requestId.middleware` y `auth.middleware` en tiempo de ejecución.
 *
 * `auth` es opcional porque con `AUTH_REQUIRED=false` la petición llega sin él.
 */

import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: JwtPayload;
    }
  }
}

export {};
