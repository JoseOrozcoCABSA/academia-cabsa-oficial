/**
 * @file Límite de peticiones, distribuido con Redis y con degradación a memoria.
 *
 * Redis comparte el contador entre todas las réplicas. Si temporalmente no está
 * disponible, el gateway sigue protegido por un contador local con limpieza
 * periódica: ni caída total ni crecimiento infinito. El contador local es **por
 * proceso**, así que con varias réplicas el límite efectivo se multiplica por el
 * número de réplicas; es degradación aceptable, no equivalente.
 *
 * Hay dos cubos con presupuestos distintos:
 *
 * - El de por omisión, general, para todo `/api`.
 * - {@link authRateLimitMiddleware}, mucho más estrecho, para las rutas de
 *   credenciales. Antes compartían presupuesto, de modo que probar contraseñas
 *   costaba lo mismo que listar el catálogo. Además éste cuenta **por cuenta
 *   además de por IP**, para que repartir el ataque entre muchas direcciones no
 *   salga gratis contra una cuenta concreta.
 *
 * @see ../config/env.ts Ventana y presupuesto de cada cubo.
 */

import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { createClient } from 'redis';
import env from '#config/env';

interface RateEntry {
  count: number;
  resetAt: number;
}

/** Presupuesto de un cubo. */
interface BucketOptions {
  /** Prefijo de la clave; separa los contadores de cada cubo. */
  name: string;
  windowMs: number;
  maxRequests: number;
  /** Deriva la clave de la petición. Por omisión, la dirección de origen. */
  keyOf?: (request: Request) => string;
}

const clients = new Map<string, RateEntry>();
const redis = env.redisUrl
  ? createClient({
    url: env.redisUrl,
    socket: { connectTimeout: 1000, reconnectStrategy: false },
  })
  : null;
let redisRetryAt = 0;

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of clients) {
    if (value.resetAt <= now) clients.delete(key);
  }
}, Math.max(env.rateLimit.windowMs, 30_000));
cleanup.unref();

const localCount = (key: string, windowMs: number, now: number): RateEntry => {
  const current = clients.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt };
  clients.set(key, entry);
  return entry;
};

const distributedCount = async (
  key: string,
  windowMs: number,
  now: number,
): Promise<RateEntry | null> => {
  if (!redis || now < redisRetryAt) return null;
  try {
    if (!redis.isReady) await redis.connect();
    const bucket = Math.floor(now / windowMs);
    const resetAt = (bucket + 1) * windowMs;
    const hashedKey = createHash('sha256').update(key).digest('hex');
    const redisKey = `academia:rate:${bucket}:${hashedKey}`;
    const results = await redis.multi()
      .incr(redisKey)
      .pExpire(redisKey, windowMs * 2)
      .exec();
    return { count: Number(results[0]), resetAt };
  } catch {
    redisRetryAt = now + 30_000;
    if (redis.isOpen) await redis.disconnect().catch(() => undefined);
    return null;
  }
};

/** Dirección de origen de la petición. */
const addressOf = (request: Request): string =>
  request.ip ?? request.socket.remoteAddress ?? 'unknown';

/** Tope de cuerpo que se intenta interpretar para extraer la identidad. */
const IDENTITY_BODY_LIMIT = 64 * 1024;

/**
 * Identidad que la petición dice tener, para las rutas de credenciales.
 *
 * Se toma del cuerpo sin confiar en ella: sólo sirve como clave de contador. Un
 * atacante puede omitirla o falsearla, pero entonces no está atacando a una
 * cuenta concreta, que es justo lo que este cubo encarece.
 *
 * El gateway recibe el cuerpo como `Buffer` (`express.raw`) para poder
 * reenviarlo intacto, así que aquí hay que interpretarlo. Un cuerpo que no sea
 * JSON válido devuelve cadena vacía y la petición queda sólo bajo el cubo de
 * dirección; no es motivo para rechazarla, de eso ya se encarga el servicio.
 */
const claimedIdentity = (request: Request): string => {
  const body: unknown = request.body;
  let source: Record<string, unknown> | undefined;
  if (Buffer.isBuffer(body)) {
    if (body.length === 0 || body.length > IDENTITY_BODY_LIMIT) return '';
    try {
      const parsed: unknown = JSON.parse(body.toString('utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        source = parsed as Record<string, unknown>;
      }
    } catch {
      return '';
    }
  } else if (body && typeof body === 'object') {
    source = body as Record<string, unknown>;
  }
  const raw = source?.identity ?? source?.email ?? '';
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().slice(0, 160);
};

/**
 * Identificador de la cuenta autenticada.
 *
 * Sale de `request.auth`, que publica el middleware de autenticación tras
 * verificar la firma, de modo que no se puede falsear para evadir el contador.
 */
const subjectOf = (request: Request): string | null => {
  const subject = request.auth?.sub;
  return typeof subject === 'string' && subject ? subject : null;
};

/** Construye un middleware de límite con su propio presupuesto. */
export const createRateLimiter = (options: BucketOptions) =>
  async function rateLimiter(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const now = Date.now();
    const key = `${options.name}:${(options.keyOf ?? addressOf)(request)}`;
    const entry = await distributedCount(key, options.windowMs, now)
      ?? localCount(key, options.windowMs, now);

    response.setHeader('X-RateLimit-Limit', options.maxRequests);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(options.maxRequests - entry.count, 0),
    );
    response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > options.maxRequests) {
      response.setHeader(
        'Retry-After',
        Math.max(Math.ceil((entry.resetAt - now) / 1000), 1),
      );
      response.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Demasiadas solicitudes. Intente nuevamente más tarde.',
        },
        requestId: request.requestId,
      });
      return;
    }
    next();
  };

const authByAddress = createRateLimiter({
  name: 'auth-ip',
  windowMs: env.authRateLimit.windowMs,
  maxRequests: env.authRateLimit.maxRequests,
});

const authByAccount = createRateLimiter({
  name: 'auth-account',
  windowMs: env.authRateLimit.windowMs,
  maxRequests: env.authRateLimit.maxRequestsPerAccount,
  keyOf: claimedIdentity,
});

/**
 * Cubo estrecho para las rutas de credenciales.
 *
 * Cuenta dos veces cada petición: una por dirección de origen y otra por la
 * cuenta que dice atacar. Basta con que cualquiera de las dos se agote para
 * responder 429, de modo que ni muchas peticiones desde una IP ni muchas IPs
 * contra una misma cuenta salen gratis.
 */
export const authRateLimitMiddleware = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  await authByAddress(request, response, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }
    // El cubo por IP ya respondió 429; no hay que seguir contando.
    if (response.headersSent) return;
    // Sin identidad declarada no hay cuenta que proteger: basta el cubo por IP.
    if (!claimedIdentity(request)) {
      next();
      return;
    }
    void authByAccount(request, response, next);
  });
};

const perUser = createRateLimiter({
  name: 'user',
  windowMs: env.userRateLimit.windowMs,
  maxRequests: env.userRateLimit.maxRequests,
  keyOf: (request) => subjectOf(request) ?? 'anonimo',
});

/**
 * Cuota por cuenta autenticada.
 *
 * Se monta **después** del middleware de autenticación, que es cuando existe
 * `request.auth`. Las peticiones anónimas —catálogo público, credenciales— no
 * pasan por aquí: para ellas ya están el cubo general y el de credenciales.
 *
 * Es la pieza que hace utilizable el sistema en un aula: al contar por persona y
 * no por dirección, treinta alumnos tras el mismo NAT no se estorban.
 */
export const userRateLimitMiddleware = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  if (!subjectOf(request)) {
    next();
    return;
  }
  await perUser(request, response, next);
};

/**
 * Cubo general de `/api`, por dirección de origen.
 *
 * Techo contra abuso automatizado, no cuota por persona; ver la nota de
 * `env.rateLimit`.
 */
export default createRateLimiter({
  name: 'general',
  windowMs: env.rateLimit.windowMs,
  maxRequests: env.rateLimit.maxRequests,
});
