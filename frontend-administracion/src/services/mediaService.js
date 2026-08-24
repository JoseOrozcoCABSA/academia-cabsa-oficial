import { apiClient } from '@/services/apiClient';

const base = '/api/content/media';

export const mediaService = {
  list: (query = '') => apiClient(`${base}${query}`),
  get: (id) => apiClient(`${base}/${id}`),
  upload: (file, values = {}) => {
    const body = new FormData();
    body.append('file', file);
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) body.append(key, String(value));
    });
    return apiClient(`${base}/upload`, { method: 'POST', body });
  },
  update: (id, values) => apiClient(`${base}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  }),
  remove: (id) => apiClient(`${base}/${id}`, { method: 'DELETE' }),
  link: (id, relation) => apiClient(`${base}/${id}/relations`, {
    method: 'POST',
    body: JSON.stringify(relation),
  }),
  unlink: (relationId) => apiClient(`${base}/relations/${relationId}`, { method: 'DELETE' }),
};
