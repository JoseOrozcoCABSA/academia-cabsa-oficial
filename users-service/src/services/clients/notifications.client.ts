/**
 * @file Adaptador HTTP hacia `notifications-service`.
 *
 * Aísla la única llamada saliente del servicio de cuentas. Antes vivía dentro de
 * `auth.service.ts`, lo que mezclaba una regla de negocio —no revelar si un
 * correo está registrado— con el detalle de qué cabecera lleva la petición
 * interna y cuánto espera antes de rendirse.
 *
 * Aquí no se decide qué hacer cuando falla: se propaga el error para que el
 * caso de uso elija. En el restablecimiento, por ejemplo, un fallo obliga a
 * borrar el token recién guardado para no dejar uno que nadie recibió.
 *
 * @see ../auth/password-reset.service.ts Único consumidor por ahora.
 */

import env from '#config/env';

/** Tiempo máximo de espera de la llamada interna, en milisegundos. */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Pide a notificaciones que envíe el correo de restablecimiento.
 *
 * @throws {Error} Si la red falla, se agota el tiempo o la respuesta no es 2xx.
 */
export const requestPasswordResetEmail = async (payload: {
  email: string;
  userId: unknown;
  resetUrl: string;
}): Promise<void> => {
  const response = await fetch(
    `${env.notificationsServiceUrl}/internal/password-reset`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': env.internalServiceKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
};
