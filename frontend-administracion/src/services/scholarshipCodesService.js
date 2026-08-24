import { apiClient } from '@/services/apiClient';

const base = '/api/users/scholarship-codes';
const query = (values) => {
  const params = new URLSearchParams();
  Object.entries(values || {}).forEach(([key, value]) => {
    if (value !== '' && value != null) params.set(key, value);
  });
  return params.toString() ? `?${params}` : '';
};

export const scholarshipCodesService = {
  overview: () => apiClient(`${base}/overview`),
  selfCancellationSetting: () => apiClient(`${base}/settings/self-cancellation`),
  updateSelfCancellationSetting: (enabled) => apiClient(`${base}/settings/self-cancellation`, {
    method: 'PATCH', body: JSON.stringify({ enabled }),
  }),
  profiles: () => apiClient(`${base}/profiles`),
  createProfile: (payload) => apiClient(`${base}/profiles`, { method: 'POST', body: JSON.stringify(payload) }),
  updateProfile: (levelId, payload) => apiClient(`${base}/profiles/${levelId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  list: (filters) => apiClient(`${base}/codes${query(filters)}`),
  validate: (payload) => apiClient(`${base}/validate`, { method: 'POST', body: JSON.stringify(payload) }),
  import: (payload) => apiClient(`${base}/import`, { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiClient(`${base}/codes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id) => apiClient(`${base}/codes/${id}`, { method: 'DELETE' }),
  previewPattern: (payload) => apiClient(`${base}/pattern/preview`, { method: 'POST', body: JSON.stringify(payload) }),
  removePattern: (payload) => apiClient(`${base}/pattern`, { method: 'DELETE', body: JSON.stringify(payload) }),
  group: (filters) => apiClient(`${base}/group${query(filters)}`),
  updateGroupExpiry: (payload) => apiClient(`${base}/group/expiry`, { method: 'PATCH', body: JSON.stringify(payload) }),
  updateUserExpiry: (id, endDate) => apiClient(`${base}/activations/${id}/expiry`, { method: 'PATCH', body: JSON.stringify({ endDate }) }),
  setActivationSuspended: (id, suspended) => apiClient(`${base}/activations/${id}/suspension`, { method: 'PATCH', body: JSON.stringify({ suspended }) }),
};
