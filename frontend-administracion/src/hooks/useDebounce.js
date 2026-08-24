/**
 * @file Hook de retardo para entradas de búsqueda.
 */

import { useEffect, useState } from 'react';

/**
 * Devuelve el valor con un retardo, reiniciando el temporizador en cada cambio.
 *
 * Sirve para no lanzar una petición por cada tecla. El primer render devuelve el
 * valor inicial sin esperar; el retardo sólo aplica a los cambios posteriores.
 *
 * @param {*} value Valor a retardar.
 * @param {number} [delay=250] Milisegundos de espera.
 * @returns {*} El valor una vez estabilizado.
 */
export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    // La limpieza cancela el temporizador anterior en cada cambio, asi que
    // solo sobrevive el ultimo: es lo que produce el retardo.
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
