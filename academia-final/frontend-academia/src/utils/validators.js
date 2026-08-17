/**
 * Validaciones de formulario del lado del cliente.
 *
 * `isEmail` solo comprueba la forma «algo@algo.algo»: no acepta comentarios ni
 * direcciones entre angulos, y tampoco verifica que el dominio exista. Es
 * validacion de conveniencia; la de verdad la hace el servidor.
 *
 * Las tres funciones estan en una sola linea en el original.
 */
export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); export const required = (value) => String(value ?? '').trim().length > 0;
