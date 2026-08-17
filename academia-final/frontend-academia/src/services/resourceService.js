/**
 * @file Fabrica del cliente CRUD de un microservicio.
 *
 * Todos los servicios del frontend son la misma funcion aplicada a un prefijo
 * distinto (`/api/academia`, `/api/users`, ...), asi que anadir un servicio es
 * una linea y no un archivo nuevo.
 *
 * Las rutas resultantes son las del controlador generico del backend:
 * `GET /:recurso`, `GET /:recurso/:id`, `POST`, `PATCH /:id`, `DELETE /:id`.
 *
 * @see apiClient.js Token, errores y evento de sesion caducada.
 */

import { apiClient, unwrapList } from '@/services/apiClient';

/**
 * Crea un cliente CRUD apuntado a un microservicio.
 *
 * `list` devuelve siempre un arreglo gracias a `unwrapList`; el resto devuelve
 * la respuesta tal cual. `query` se concatena sin procesar, asi que quien llame
 * debe incluir el `?` o el `&` y escapar los valores.
 *
 * @param {string} prefix Prefijo del servicio en el gateway, sin barra final.
 */
export const createResourceService = (prefix) => ({
  list: async (resource, query = '') => unwrapList(await apiClient(`${prefix}/${resource}${query}`)),
  get: (resource, id) => apiClient(`${prefix}/${resource}/${id}`),
  create: (resource, values) => apiClient(`${prefix}/${resource}`, {
    method: 'POST', body: JSON.stringify(values),
  }),
  update: (resource, id, values) => apiClient(`${prefix}/${resource}/${id}`, {
    method: 'PATCH', body: JSON.stringify(values),
  }),
  remove: (resource, id) => apiClient(`${prefix}/${resource}/${id}`, { method: 'DELETE' }),
});
