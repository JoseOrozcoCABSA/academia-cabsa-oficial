/**
 * @file Dirección del gateway y prefijos de cada servicio.
 *
 * Todo el frontend habla únicamente con el gateway (puerto 6080), nunca con los
 * microservicios directamente.
 */

/**
 * URL base del gateway.
 *
 * Se toma de `VITE_API_URL` y cae a localhost si no está definida. Como Vite
 * inyecta las variables en tiempo de compilación, cambiarla exige reconstruir el
 * paquete: no se puede ajustar en caliente. La barra final se recorta para que
 * al concatenar rutas no queden dobles.
 */
export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:6080').replace(/\/$/, '');
const inferredPortalUrl = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:5007';
  const portalPort = window.location.port === '5008'
    ? '5007'
    : window.location.port === '6008'
      ? '6007'
      : window.location.port;
  return `${window.location.protocol}//${window.location.hostname}${portalPort ? `:${portalPort}` : ''}`;
};
export const PORTAL_URL = (import.meta.env.VITE_PORTAL_URL || inferredPortalUrl()).replace(/\/$/, '');

/** Prefijos del gateway por servicio. Deben coincidir con `gatewayPath` del gateway. */
export const API_PATHS = Object.freeze({
  academia: '/api/academia',
  ai: '/api/ai',
  content: '/api/content',
  analytics: '/api/analytics',
  users: '/api/users',
  notifications: '/api/notifications',
});
