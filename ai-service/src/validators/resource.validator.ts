/**
 * @file Validador generico del cuerpo de las peticiones de recursos.
 */

/** Veredicto del validador. */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Comprueba unicamente que el cuerpo sea un objeto JSON plano.
 *
 * Rechaza `null` y los arreglos, que en JavaScript tambien son `object`. No
 * valida campos ni tipos: es la comprobacion minima para que el CRUD generico
 * opere con cualquier tabla. Las reglas por entidad van en su servicio.
 */
export const validateResourcePayload = (payload: unknown): ValidationResult => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, message: 'El cuerpo debe ser un objeto JSON' };
  }
  return { valid: true };
};
