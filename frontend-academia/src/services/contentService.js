/**
 * @file Servicio `contentService` del frontend.
 *
 * Se apoya en `apiClient`, `resourceService`, que a su vez llama al gateway.
 *
 * Operaciones (2):
 * - `listPublishedCapsules()`
 * - `findCapsuleBySlug(slug)`
 *
 * Los errores se propagan como `Error` con el mensaje del backend:
 * quien llame debe capturarlos y mostrarlos.
 */

import { apiClient, unwrapList } from '@/services/apiClient';
import { createResourceService } from '@/services/resourceService';

const resources = createResourceService('/api/content');

/**
 * Cliente del servicio de contenido, con los metodos genericos mas los propios
 * de la mediateca.
 *
 * Extiende el CRUD generico con `...resources`, asi que conserva `list`, `get`,
 * `create`, `update` y `remove` y anade consultas ya filtradas a lo publicado.
 */
export const contentService = {
  ...resources,

  listPublishedCapsules: async () => {
    const query = '&status=published&orderBy=published_at&orderDirection=DESC';
    const [firstPage, secondPage] = await Promise.all([
      apiClient(`/api/content/capsules?limit=100&offset=0${query}`),
      apiClient(`/api/content/capsules?limit=100&offset=100${query}`),
    ]);
    return [...unwrapList(firstPage), ...unwrapList(secondPage)]
      .filter((item) => String(item.category || '').toUpperCase() !== 'BLOG');
  },

  listPublishedBlog: async () => {
    const result = await apiClient('/api/content/capsules?category=BLOG&status=published&limit=12&orderBy=published_at&orderDirection=DESC');
    return unwrapList(result);
  },

  findBlogBySlug: (slug) => apiClient(
    `/api/content/capsules/record?slug=${encodeURIComponent(slug)}&category=BLOG&status=published`,
  ),

  findCapsuleBySlug: (slug) => apiClient(
    `/api/content/capsules/record?slug=${encodeURIComponent(slug)}&status=published`,
  ),
};
