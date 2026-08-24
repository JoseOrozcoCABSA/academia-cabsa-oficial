import { apiClient } from '@/services/apiClient';
const base = '/api/users/user-dashboard';
export const userDashboardService = {
  overview: () => apiClient(`${base}/overview`),
  groupAnalytics: () => apiClient(`${base}/group-analytics`),
  accessMatrix: () => apiClient(`${base}/access-matrix`),
  updateAccess: (levelId, sectionCode, allowed) => apiClient(`${base}/access-matrix/${levelId}/${sectionCode}`, {
    method: 'PATCH', body: JSON.stringify({ allowed }),
  }),
  resourceAccessRules: () => apiClient(`${base}/access-resources`),
  updateResourceAccess: (levelId, resourceType, resourceKey, allowed) => apiClient(`${base}/access-resources/${levelId}/${resourceType}/${encodeURIComponent(resourceKey)}`, {
    method: 'PATCH', body: JSON.stringify({ allowed }),
  }),
  updateAccount: (id, payload) => apiClient(`${base}/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  updateOfficial: (id, payload) => apiClient(`${base}/official/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  createGroup: (payload) => apiClient(`${base}/rosters`, { method: 'POST', body: JSON.stringify(payload) }),
  updateGroup: (id, payload) => apiClient(`${base}/rosters/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  removeGroup: (id) => apiClient(`${base}/rosters/${id}`, { method: 'DELETE' }),
  assignGroup: (id, groupId) => apiClient(`${base}/official/${id}/groups/${groupId}`, { method: 'POST' }),
  removeFromGroup: (id, groupId) => apiClient(`${base}/official/${id}/groups/${groupId}`, { method: 'DELETE' }),
  importCentralBase: (payload) => apiClient(`${base}/central-base/imports`, { method: 'POST', body: JSON.stringify(payload) }),
  centralBaseHistory: () => apiClient(`${base}/central-base/history`),
  importRoster: (groupId, payload) => apiClient(`${base}/rosters/${groupId}/imports`, { method: 'POST', body: JSON.stringify(payload) }),
  roster: (groupId, filters = {}) => apiClient(`${base}/rosters/${groupId}/current?${new URLSearchParams(filters)}`),
  rosterHistory: (groupId) => apiClient(`${base}/rosters/${groupId}/history`),
  restoreRoster: (groupId, importId) => apiClient(`${base}/rosters/${groupId}/imports/${importId}/restore`, { method: 'POST' }),
  rosterAction: (groupId, payload) => apiClient(`${base}/rosters/${groupId}/actions`, { method: 'POST', body: JSON.stringify(payload) }),
};
