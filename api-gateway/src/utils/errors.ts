/**
 * @file Error propio del gateway.
 *
 * @see middlewares/error.middleware.ts Donde se traduce a respuesta HTTP.
 */

/**
 * Error con código HTTP, clave estable y detalles del fallo aguas arriba.
 *
 * A diferencia del `AppError` de los servicios, añade `details`, que el proxy
 * usa para adjuntar qué servicio falló y por qué. Comprobar que el middleware
 * de errores no lo devuelva al cliente si contiene URLs internas.
 */
export class GatewayError extends Error {
  /** Código HTTP con el que se responderá. */
  readonly status: number;

  /** Clave estable, p. ej. `UPSTREAM_TIMEOUT`. */
  readonly code: string;

  /** Contexto del fallo: servicio, destino y causa original. */
  readonly details?: unknown;

  constructor(
    message: string,
    status = 500,
    code = 'GATEWAY_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
