/**
 * @file Cliente HTTP único del frontend. Todas las llamadas pasan por aquí.
 *
 * @see config/api.js URL del gateway.
 */

import { API_URL } from '@/config/api';
import { TOKEN_KEY } from '@/config/constants';

/**
 * Convierte el cuerpo a objeto sólo si la respuesta dice ser JSON.
 *
 * Devuelve `null` para cualquier otro tipo, así que una descarga binaria no se
 * puede obtener con este cliente.
 */
const parseBody = async (response) => {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) return null;
  return response.json();
};

const normalizeMediaReferences = (value) => {
  if (typeof value === 'string') {
    const marker = '/api/content/media/files/';
    let normalized = value.replace(
      /https?:\/\/[^/\s"'<>]+(?=\/api\/content\/media\/files\/)/gi,
      API_URL,
    );
    if (normalized.startsWith(marker)) normalized = `${API_URL}${normalized}`;
    return normalized.replace(
      /(["'(=])\/api\/content\/media\/files\//g,
      `$1${API_URL}/api/content/media/files/`,
    );
  }
  if (Array.isArray(value)) return value.map(normalizeMediaReferences);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeMediaReferences(item)]));
  }
  return value;
};

/**
 * Realiza la petición al gateway y devuelve ya el contenido útil.
 *
 * Detalles del contrato:
 * - Toma el token de `localStorage` y, si no está, de `sessionStorage`.
 * - Fija `Content-Type: application/json` salvo que el cuerpo sea `FormData`,
 *   caso en el que deja que el navegador ponga el `boundary`.
 * - **Desenvuelve el sobre del backend**: devuelve `payload.data`, no la
 *   respuesta completa. Quien llama recibe directamente los datos.
 * - Ante un 401 emite el evento global `cabsa:unauthorized`, que el contexto de
 *   autenticación escucha para cerrar la sesión. Además lanza el error.
 * - Un fallo de red se convierte en un mensaje que menciona el puerto 5000;
 *   conviene ajustarlo si el gateway cambia de puerto.
 *
 * @param {string} path Ruta con su prefijo, p. ej. `/api/users/auth/login`.
 * @param {RequestInit} [options] Opciones de `fetch`.
 * @returns {Promise<*>} El contenido de `data`, o `null`.
 * @throws {Error} Con el mensaje del backend si la respuesta no es correcta.
 */
export const apiClient = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY)
    || sessionStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`No fue posible conectar con el Gateway configurado en ${API_URL}.`);
  }
  const payload = await parseBody(response);
  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || `Solicitud rechazada (${response.status})`;
    if (response.status === 401) window.dispatchEvent(new Event('cabsa:unauthorized'));
    const error = new Error(message);
    error.code = payload?.error?.code || payload?.code;
    error.status = response.status;
    throw error;
  }
  return normalizeMediaReferences(payload?.data ?? payload ?? null);
};

/**
 * Extrae el arreglo de una respuesta, sea cual sea su forma.
 *
 * Los endpoints no son homogéneos: unos devuelven el arreglo directo y otros lo
 * envuelven en `rows`, `items` o `data`. Esta función absorbe esa diferencia y
 * devuelve `[]` si no reconoce ninguna, de modo que nunca propaga `undefined` a
 * un `.map()`.
 */
export const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
