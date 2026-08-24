/**
 * @file Hook de búsqueda diferida del código postal.
 *
 * Encapsula el efecto que antes vivía dentro de `Register.jsx`: espera a que el
 * usuario deje de teclear, consulta el catálogo y descarta las respuestas que
 * llegan tarde.
 *
 * Las dos protecciones que tiene son la razón de que esto sea un hook y no una
 * llamada suelta: el temporizador se cancela en la limpieza del efecto, así que
 * teclear rápido no lanza una petición por pulsación; y la bandera `active`
 * descarta la respuesta si el componente se desmontó o si el código cambió
 * mientras la petición viajaba, que es lo que evita que una respuesta vieja
 * pise a una nueva.
 *
 * @see ../utils/registrationForm.js Reglas puras del formulario.
 */

import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import {
  POSTAL_PROMPT,
  isPostalCodeComplete,
  postalStatusFor,
} from '@/utils/registrationForm';

/** Espera tras la última pulsación antes de consultar, en milisegundos. */
const DEBOUNCE_MS = 300;

/**
 * Resuelve un código postal en estado, municipio y colonias.
 *
 * @param postalCode Código tal como está en el formulario.
 * @param enabled Si la búsqueda aplica; con `false` limpia el resultado.
 * @param onSingleColony Se invoca con la única colonia cuando sólo hay una,
 *   para que el formulario la seleccione solo.
 * @returns `{ location, status, loading }`.
 */
export function usePostalCodeLookup(postalCode, enabled, onSingleColony) {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState(POSTAL_PROMPT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // La ubicación se descarta en cuanto cambia el código, antes de consultar:
    // dejar visible el municipio del código anterior mientras se resuelve el
    // nuevo haría creer que el dato corresponde a lo que se acaba de escribir.
    setLocation(null);
    if (!enabled || !isPostalCodeComplete(postalCode)) {
      setStatus(POSTAL_PROMPT);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setStatus('Buscando ubicación…');
      try {
        const result = await authService.postalCode(postalCode);
        if (!active) return;
        setLocation(result);
        setStatus(postalStatusFor(result.colonies));
        if (result.colonies.length === 1) onSingleColony?.(result.colonies[0]);
      } catch (requestError) {
        if (!active) return;
        setLocation(null);
        setStatus(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // `onSingleColony` se omite a propósito: es una función nueva en cada
    // renderizado y volvería a lanzar la búsqueda en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postalCode, enabled]);

  return { location, status, loading };
}
