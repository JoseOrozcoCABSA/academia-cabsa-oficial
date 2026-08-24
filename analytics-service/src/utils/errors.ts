/**
 * @file Error de dominio con código HTTP y clave estable.
 *
 * @see middlewares/error.middleware.ts Donde se traduce a respuesta HTTP.
 */

/**
 * Error que el middleware de errores sabe serializar.
 *
 * La `code` es la clave que consume el frontend para decidir qué mensaje
 * mostrar, así que es contrato público: no cambiarla sin avisar.
 *
 * Cualquier error que no sea `AppError` se trata como 500 genérico y su mensaje
 * no se expone al cliente.
 */
export class AppError extends Error {
  /** Código HTTP con el que se responderá. */
  readonly status: number;

  /** Clave estable del error, p. ej. `WHERE_REQUIRED`. */
  readonly code: string;

  constructor(message: string, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}
