/**
 * @file Lectura del token y del usuario guardados en el navegador.
 *
 * Sólo lee: quien escribe estas claves es el contexto de autenticación. Lee de
 * `localStorage` únicamente, así que no ve una sesión guardada en
 * `sessionStorage` —a diferencia de `apiClient`, que consulta ambos—.
 *
 * `user()` hace `JSON.parse` sin protección: si el valor almacenado estuviera
 * corrupto, lanzaría.
 */

import { TOKEN_KEY, USER_KEY } from '@/config/constants'; export const authStore = { token: () => localStorage.getItem(TOKEN_KEY), user: () => JSON.parse(localStorage.getItem(USER_KEY) || 'null') };
