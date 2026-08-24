/**
 * @file Servicio `profileService` del frontend.
 *
 * Se apoya en `apiClient`, que a su vez llama al gateway.
 *
 * Operaciones (3):
 * - `get()`
 * - `update(values)`
 * - `updatePassword(values)`
 *
 * Los errores se propagan como `Error` con el mensaje del backend:
 * quien llame debe capturarlos y mostrarlos.
 */

import { apiClient } from '@/services/apiClient';

const prefix = '/api/users/profile';

/**
 * Consulta y edicion del perfil propio.
 *
 * Cuidado con `update`: usa `PATCH`, pero el backend guarda como nulos los
 * campos que no lleguen. Hay que enviar el perfil completo o se borran los
 * datos omitidos.
 */
export const profileService = {
  get: () => apiClient(prefix),

  update: (values) => apiClient(prefix, {
    method: 'PATCH',
    body: JSON.stringify(values),
  }),

  updatePassword: (values) => apiClient(`${prefix}/password`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  }),

  getManagedGroup: (groupId) => apiClient(
    `${prefix}/group${groupId ? `?groupId=${encodeURIComponent(groupId)}` : ''}`,
  ),

  getStudentProgress: (studentId, groupId) => {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return apiClient(`${prefix}/group/students/${encodeURIComponent(studentId)}/progress${query}`);
  },

  createStudent: (values) => apiClient(`${prefix}/group/students`, {
    method: 'POST',
    body: JSON.stringify(values),
  }),

  updateManagedStudent: (studentId, values) => apiClient(
    `${prefix}/group/students/${encodeURIComponent(studentId)}`,
    { method: 'PATCH', body: JSON.stringify(values) },
  ),

  updateStudentStatus: (studentId, groupId, status) => apiClient(
    `${prefix}/group/students/${encodeURIComponent(studentId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ groupId, status }),
    },
  ),

  removeStudentFromGroup: (studentId, groupId) => apiClient(
    `${prefix}/group/students/${encodeURIComponent(studentId)}`,
    { method: 'DELETE', body: JSON.stringify({ groupId }) },
  ),

  restoreStudentToGroup: (studentId, groupId) => apiClient(
    `${prefix}/group/students/${encodeURIComponent(studentId)}/restore`,
    { method: 'POST', body: JSON.stringify({ groupId }) },
  ),

  assignStudentScholarship: (studentId, groupId) => apiClient(
    `${prefix}/group/students/${encodeURIComponent(studentId)}/scholarship`,
    {
      method: 'POST',
      body: JSON.stringify({ groupId }),
    },
  ),

  activateScholarship: (code) => apiClient(`${prefix}/scholarship/activate`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  }),

  cancelScholarship: () => apiClient(`${prefix}/scholarship`, {
    method: 'DELETE',
  }),

};
