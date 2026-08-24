/**
 * @file Servicio `authService` del frontend.
 *
 * Se apoya en `apiClient`, que a su vez llama al gateway.
 *
 * Operaciones (3):
 * - `login(identity, password)`
 * - `register(values)`
 * - `me()`
 *
 * Los errores se propagan como `Error` con el mensaje del backend:
 * quien llame debe capturarlos y mostrarlos.
 */

import { apiClient } from '@/services/apiClient';

/**
 * Operaciones de acceso del panel.
 *
 * No expone `remember`: el panel siempre persiste la sesion en `localStorage`.
 */
export const authService = {
  login: (identity, password) => apiClient('/api/users/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identity, password }),
  }),
  register: (values) => apiClient('/api/users/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
  }),
  me: () => apiClient('/api/users/auth/me'),
  forgotPassword: (email) => apiClient('/api/users/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  resetPassword: (values) => apiClient('/api/users/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(values),
  }),
};
