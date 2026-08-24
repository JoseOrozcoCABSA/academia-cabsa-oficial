/**
 * @file Cliente HTTP del panel: unico punto por el que se habla con el gateway.
 *
 * Anade el token a cada peticion y, ante un 401, avisa a la aplicacion con el
 * evento `cabsa:unauthorized` para que el contexto de autenticacion cierre la
 * sesion. Ningun servicio deberia llamar a `fetch` por su cuenta.
 *
 * @see context/AuthContext.jsx Escucha del evento y cierre de sesion.
 */

import { API_URL } from '@/config/api';
import { TOKEN_KEY } from '@/config/constants';

/**
 * Lee el cuerpo solo si viene declarado como JSON.
 *
 * Devuelve `null` en cualquier otro caso, con lo que una pagina de error HTML
 * del servidor —un 502 del proxy, por ejemplo— no rompe el analisis, aunque a
 * cambio se pierde su texto y el aviso queda generico.
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
 * Ejecuta una peticion contra el gateway.
 *
 * Fija `Content-Type: application/json` salvo que el cuerpo sea `FormData`, caso
 * en el que hay que dejar que el navegador escriba el suyo con el delimitador;
 * ponerlo a mano rompe la subida de archivos.
 *
 * Un fallo de red se convierte en un mensaje que menciona el puerto 5000, para
 * distinguir «el gateway no esta levantado» de «el gateway respondio con
 * error».
 *
 * El token se lee de `localStorage` en cada llamada, no se guarda en memoria,
 * de modo que un cierre de sesion surte efecto de inmediato.
 *
 * @param {string} path Ruta relativa al gateway, empezando por `/`.
 * @throws {Error} Con el mensaje del backend si respondio JSON, o uno generico
 *   si no. Un 401 dispara `cabsa:unauthorized` antes de lanzar.
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
    throw new Error(message);
  }
  return normalizeMediaReferences(payload?.data ?? payload ?? null);
};

/**
 * Saca el arreglo de datos de una respuesta de listado.
 *
 * Acepta cuatro formas —arreglo directo, `rows`, `items` y `data`— porque los
 * servicios no responden igual entre si.
 *
 * Aviso al depurar: ante una forma imprevista devuelve un arreglo vacio en
 * silencio, asi que un cambio de contrato en el backend se ve como «no hay
 * registros» y no como un error.
 */
export const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
