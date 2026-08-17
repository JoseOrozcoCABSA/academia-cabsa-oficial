/**
 * @file Verificacion del token en el gateway.
 *
 * Es el unico punto donde se comprueba la firma: los microservicios estan a la
 * escucha solo en `127.0.0.1` y confian en que quien les llega ya paso por aqui.
 *
 * Comprueba **identidad, no permisos**. Cada servicio decide despues si el rol
 * del usuario le permite la operacion.
 *
 * @see ../types/express.d.ts Extension de `Request` con `auth`.
 */

import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import env from '#config/env';
import { sessionDescriptor } from './session-validation.js';

const publicRoutes = new Set([
  '/api/users/auth/login',
  '/api/users/auth/register',
  '/api/users/auth/forgot-password',
  '/api/users/auth/reset-password',
  '/api/users/auth/verify-email',
  '/api/users/auth/resend-verification',
]);

const publicContentRoutes = [
  '/api/content/capsules',
  '/api/content/materials',
  '/api/content/videos',
  '/api/content/documents',
  '/api/content/media/files',
];

const publicAcademiaRoutes = [
  '/api/academia/courses',
  '/api/academia/lessons',
  '/api/academia/forums',
];

const publicUsersReadRoutes = [
  '/api/users/auth/registration',
];

const publicAiReadRoutes = [
  '/api/ai/catalog/assistant-tutor-links',
];

const publicAnalyticsWriteRoutes = new Set([
  '/api/analytics/track/ai',
  '/api/analytics/track/platform',
]);

/**
 * Verifica el token y deja su contenido en `request.auth`.
 *
 * Al depurar, tener en cuenta que **cualquier fallo se traduce al mismo 401**:
 * token ausente, con formato invalido, caducado o firmado con otro secreto se
 * ven igual. Un secreto mal configurado aparece como problema de credenciales y
 * no como error del servidor.
 *
 * Solo comprueba la identidad. Los permisos son cosa de cada microservicio.
 */
export default async function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const requestPath = request.originalUrl.split('?')[0];
  const isPublicContentRead = request.method === 'GET'
    && publicContentRoutes.some((prefix) => (
      requestPath === prefix || requestPath.startsWith(`${prefix}/`)
    ));
  const isPublicAcademiaRead = request.method === 'GET'
    && publicAcademiaRoutes.some((prefix) => (
      requestPath === prefix || requestPath.startsWith(`${prefix}/`)
    ));
  const isPublicUsersRead = request.method === 'GET'
    && publicUsersReadRoutes.some((prefix) => (
      requestPath === prefix || requestPath.startsWith(`${prefix}/`)
    ));
  const isPublicAiRead = request.method === 'GET'
    && publicAiReadRoutes.some((prefix) => (
      requestPath === prefix || requestPath.startsWith(`${prefix}/`)
    ));

  if (
    !env.authRequired
    || request.method === 'OPTIONS'
    || publicRoutes.has(requestPath)
    || isPublicContentRead
    || isPublicAcademiaRead
    || isPublicUsersRead
    || isPublicAiRead
    || (request.method === 'POST' && publicAnalyticsWriteRoutes.has(requestPath))
  ) {
    next();
    return;
  }

  const authorization = request.header('authorization');
  if (!authorization) {
    response.status(401).json({
      success: false,
      error: { code: 'TOKEN_REQUIRED', message: 'Token JWT requerido' },
      requestId: request.requestId,
    });
    return;
  }
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    response.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Formato Bearer inválido' },
      requestId: request.requestId,
    });
    return;
  }
  let payload: JwtPayload;
  try {
    const verified = jwt.verify(match[1], env.jwtSecret);
    if (typeof verified === 'string') throw new Error('JWT payload inválido');
    payload = verified;
  } catch {
    response.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token inválido o vencido' },
      requestId: request.requestId,
    });
    return;
  }

  const session = sessionDescriptor(payload);
  if (!session) {
    response.status(401).json({
      success: false,
      error: { code: 'SESSION_REQUIRED', message: 'La sesión debe renovarse' },
      requestId: request.requestId,
    });
    return;
  }

  try {
    const validation = await fetch(`${env.authServiceUrl}/internal/session/validate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-key': env.internalServiceKey,
      },
      body: JSON.stringify(session),
      signal: AbortSignal.timeout(Math.min(env.requestTimeoutMs, 3000)),
    });
    if (!validation.ok) throw new Error(`users-service HTTP ${validation.status}`);
    const result = await validation.json() as { valid?: boolean };
    if (!result.valid) {
      response.status(401).json({
        success: false,
        error: { code: 'SESSION_REVOKED', message: 'La sesión ya no está vigente' },
        requestId: request.requestId,
      });
      return;
    }
    request.auth = payload;
    next();
  } catch {
    response.status(503).json({
      success: false,
      error: { code: 'SESSION_VALIDATION_UNAVAILABLE', message: 'No fue posible validar la sesión' },
      requestId: request.requestId,
    });
  }
}
