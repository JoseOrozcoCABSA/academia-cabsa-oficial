/**
 * @file Servicio `authService` del frontend.
 *
 * Se apoya en `apiClient`, que a su vez llama al gateway.
 *
 * Operaciones (5):
 * - `login(identity, password, remember = false)`
 * - `register(values)`
 * - `me()`
 * - `registrationCatalog()`
 * - `postalCode(postalCode)`
 *
 * Los errores se propagan como `Error` con el mensaje del backend:
 * quien llame debe capturarlos y mostrarlos.
 */

import { apiClient } from '@/services/apiClient';

/**
 * Operaciones de acceso y del catalogo de domicilios.
 *
 * Son las unicas llamadas que no necesitan token, porque se usan antes de tener
 * sesion. `login` acepta correo o nombre de usuario en el mismo campo, y
 * `remember` decide si la sesion sobrevive al cierre del navegador.
 */
export const authService = {
  login: (identity, password, remember = false) => apiClient('/api/users/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identity, password, remember }),
  }),
  register: (values) => apiClient('/api/users/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
  }),
  me: () => apiClient('/api/users/auth/me'),
  registrationCatalog: () => apiClient('/api/users/auth/registration/catalog'),
  postalCode: (postalCode) => apiClient(
    `/api/users/auth/registration/postal/${encodeURIComponent(postalCode)}`,
  ),
  forgotPassword: (email) => apiClient('/api/users/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  resetPassword: (values) => apiClient('/api/users/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(values),
  }),
  verifyEmail: (email, code) => apiClient('/api/users/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }),
  resendVerification: (email) => apiClient('/api/users/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
};
