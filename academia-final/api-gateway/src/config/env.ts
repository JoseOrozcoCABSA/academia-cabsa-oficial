/**
 * @file Configuración del gateway leída del entorno.
 *
 * Las opciones sensibles se validan al cargar el modulo. Produccion no permite
 * desactivar la autenticacion ni arrancar sin una lista CORS explicita.
 */

import dotenv from 'dotenv';

dotenv.config();

const positiveInteger = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} debe ser un entero positivo`);
  }
  return value;
};

const requiredValue = (name: string, minimumLength = 1): string => {
  const value = process.env[name]?.trim();
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} es obligatorio y debe tener al menos ${minimumLength} caracteres`);
  }
  return value;
};

/**
 * Lee una variable booleana.
 *
 * Sólo la cadena `"true"` (en cualquier combinación de mayúsculas) cuenta como
 * verdadero; cualquier otro valor, incluido `"1"`, se interpreta como falso.
 */
const booleanValue = (name: string, fallback: boolean): boolean => {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (!/^(true|false)$/i.test(value)) {
    throw new Error(`${name} solo admite true o false`);
  }
  return value.toLowerCase() === 'true';
};

const production = process.env.NODE_ENV === 'production';
const authRequired = booleanValue('AUTH_REQUIRED', true);
if (production && !authRequired) {
  throw new Error('AUTH_REQUIRED no puede ser false en produccion');
}
const corsOrigins = (
  process.env.CORS_ORIGINS
  ?? (production ? '' : 'http://localhost:5007,http://localhost:5008')
).split(',').map((origin) => origin.trim()).filter(Boolean);
if (!corsOrigins.length) throw new Error('CORS_ORIGINS es obligatorio en produccion');

/** Configuración congelada del gateway. */
const env = Object.freeze({
  port: positiveInteger('PORT', 6080),
  bindHost: process.env.BIND_HOST?.trim() || '127.0.0.1',
  gatewayName: process.env.GATEWAY_NAME ?? 'academia-api-gateway',
  jwtSecret: requiredValue('JWT_SECRET', 32),
  internalServiceKey: requiredValue('INTERNAL_SERVICE_KEY', 32),
  authRequired,
  corsOrigins,
  requestTimeoutMs: positiveInteger('REQUEST_TIMEOUT_MS', 10000),
  authServiceUrl: process.env.AUTH_SERVICE_URL?.trim() || 'http://127.0.0.1:6005',
  /**
   * Saltos de proxy en los que confiar para resolver la dirección de origen.
   *
   * Por omisión **cero**: sin proxy inverso delante, confiar en
   * `X-Forwarded-For` deja que el cliente declare su propia dirección, y con eso
   * el cubo de peticiones por dirección se evade rotando la cabecera. Como
   * `docker-compose.yml` publica el gateway directamente al host, ése es el caso
   * por defecto.
   *
   * Subirlo a 1 sólo cuando haya de verdad un proxy inverso que **reescriba**
   * la cabecera; si no, se está confiando en el atacante.
   */
  trustProxy: positiveInteger('TRUST_PROXY_HOPS', 0),
  redisUrl: process.env.REDIS_URL?.trim() || null,
  /**
   * Cubo general por dirección de origen.
   *
   * Es un techo contra abuso automatizado, **no** una cuota por persona. Los
   * centros educativos salen a internet tras un NAT compartido: un aula entera
   * comparte dirección, así que un presupuesto ajustado dejaría fuera a un grupo
   * completo por el uso normal de sus integrantes. La cuota por persona es
   * {@link userRateLimit}, que se aplica después de identificar al usuario.
   */
  rateLimit: {
    windowMs: positiveInteger('RATE_LIMIT_WINDOW_MS', 60000),
    maxRequests: positiveInteger('RATE_LIMIT_MAX_REQUESTS', 1200),
  },
  /**
   * Cuota por cuenta autenticada.
   *
   * Se aplica tras verificar el token, con la clave puesta en el identificador
   * del usuario. Al no depender de la dirección de origen, treinta alumnos en la
   * misma aula tienen treinta presupuestos independientes.
   */
  userRateLimit: {
    windowMs: positiveInteger('USER_RATE_LIMIT_WINDOW_MS', 60000),
    maxRequests: positiveInteger('USER_RATE_LIMIT_MAX_REQUESTS', 180),
  },
  /**
   * Cubos de las rutas de credenciales.
   *
   * El que de verdad frena la fuerza bruta es el de cuenta: acota los intentos
   * contra una cuenta concreta vengan de donde vengan, sin castigar a quienes
   * comparten salida a internet. El de dirección es deliberadamente holgado, por
   * la misma razón que {@link rateLimit}.
   */
  authRateLimit: {
    windowMs: positiveInteger('AUTH_RATE_LIMIT_WINDOW_MS', 900000),
    maxRequests: positiveInteger('AUTH_RATE_LIMIT_MAX_PER_IP', 300),
    maxRequestsPerAccount: positiveInteger('AUTH_RATE_LIMIT_MAX_PER_ACCOUNT', 10),
  },
});

export default env;
