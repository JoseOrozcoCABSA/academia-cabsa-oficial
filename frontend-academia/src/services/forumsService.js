/**
 * @file Servicio `forumsService` del frontend.
 *
 * Se apoya en `apiClient`, que a su vez llama al gateway.
 *
 * Operaciones (9):
 * - `listForums()`
 * - `latestTopics()`
 * - `findForumBySlug(slug)`
 * - `findForumById(id)`
 * - `listTopics(forumId)`
 * - `findTopicBySlug(slug)`
 * - `listReplies(topicId)`
 * - `createTopic({ forumId, title, content, user })`
 * - `createReply({ topicId, forumId, content, user })`
 *
 * Los errores se propagan como `Error` con el mensaje del backend:
 * quien llame debe capturarlos y mostrarlos.
 */

import { apiClient, unwrapList } from '@/services/apiClient';

const prefix = '/api/academia/forums';
/** Serializa los filtros a cadena de consulta, con el escapado ya resuelto. */
const query = (values) => `?${new URLSearchParams(values).toString()}`;

/**
 * Peticion de listado que siempre devuelve un arreglo.
 *
 * `unwrapList` absorbe las distintas formas de respuesta del gateway, de modo
 * que quien llama puede recorrer el resultado sin comprobar nada.
 */
const list = async (path, values) => unwrapList(
  await apiClient(`${prefix}${path}${query(values)}`),
);

/**
 * Convierte un titulo en identificador de URL.
 *
 * Descompone los acentos y los descarta, de forma que «Programacion» y
 * «Programación» dan el mismo resultado. Corta a 150 caracteres para no exceder
 * la columna de la base de datos.
 *
 * Cuidado: un titulo compuesto solo por acentos o simbolos produce cadena
 * vacia, y no se comprueba que el resultado sea unico.
 */
const slugify = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 150);

/**
 * Operaciones de foros, temas y respuestas.
 *
 * Los listados piden `status: 'published'`, asi que los borradores no llegan al
 * frontend publico.
 */
export const forumsService = {
  listForums: () => list('', {
    status: 'published',
    limit: '100',
    orderBy: 'id',
    orderDirection: 'ASC',
  }),

  latestTopics: () => list('/topics', {
    status: 'published',
    limit: '10',
    orderBy: 'created_at',
    orderDirection: 'DESC',
  }),

  findForumBySlug: (slug) => apiClient(
    `${prefix}/record${query({ slug, status: 'published' })}`,
  ),

  findForumById: (id) => apiClient(`${prefix}/${id}`),

  listTopics: (forumId) => list('/topics', {
    forum_id: String(forumId),
    status: 'published',
    limit: '100',
    orderBy: 'created_at',
    orderDirection: 'DESC',
  }),

  findTopicBySlug: (slug) => apiClient(
    `${prefix}/topics/record${query({ slug, status: 'published' })}`,
  ),

  listReplies: (topicId) => list('/replies', {
    topic_id: String(topicId),
    status: 'published',
    limit: '100',
    orderBy: 'created_at',
    orderDirection: 'ASC',
  }),

  createTopic: ({ forumId, title, content, user }) => {
    const now = new Date().toISOString();
    return apiClient(`${prefix}/topics`, {
      method: 'POST',
      body: JSON.stringify({
        forum_id: forumId,
        author_id: user?.id || null,
        author_name: user?.display_name || user?.name || user?.username || 'Comunidad CABSA',
        slug: `${slugify(title) || 'tema'}-${Date.now().toString(36)}`,
        title: title.trim(),
        content: content.trim(),
        status: 'published',
        created_at: now,
        updated_at: now,
      }),
    });
  },

  createReply: ({ topicId, forumId, content, user }) => {
    const now = new Date().toISOString();
    return apiClient(`${prefix}/replies`, {
      method: 'POST',
      body: JSON.stringify({
        topic_id: topicId,
        forum_id: forumId,
        author_id: user?.id || null,
        author_name: user?.display_name || user?.name || user?.username || 'Comunidad CABSA',
        content: content.trim(),
        status: 'published',
        created_at: now,
        updated_at: now,
      }),
    });
  },
};
