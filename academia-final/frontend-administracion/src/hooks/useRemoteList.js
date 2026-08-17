/**
 * @file Hook de carga de listados con datos de reserva.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga una lista remota y, si falla o viene vacía, muestra datos de reserva.
 *
 * Comportamiento que conviene tener claro: **cuando la petición falla, la
 * interfaz no queda vacía, sino que muestra el catálogo estático de
 * `fallback`**. El indicador `usingReference` es la única señal de que lo que se
 * ve no viene del servidor; si la pantalla no lo muestra, el usuario creerá que
 * son datos reales.
 *
 * El `fallback` se guarda en una referencia para que cambiar ese arreglo no
 * vuelva a disparar la carga; sólo `loader` está en las dependencias. Por eso
 * `loader` debe venir memoizado con `useCallback`, o el hook recargará en cada
 * render.
 *
 * @param {Function} loader Función asíncrona que devuelve el arreglo.
 * @param {Array} [fallback=[]] Datos de reserva.
 * @returns {{items: Array, loading: boolean, error: string,
 *   usingReference: boolean, reload: Function, setItems: Function}}
 */
export function useRemoteList(loader, fallback = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingReference, setUsingReference] = useState(false);
  const fallbackRef = useRef(fallback);
  useEffect(() => { fallbackRef.current = fallback; }, [fallback]);
  /**
   * Vuelve a pedir los datos.
   *
   * Se expone para poder refrescar tras crear o borrar un registro, sin tener
   * que recargar la pagina.
   *
   * Si la peticion falla y hay datos de reserva, los deja visibles y marca
   * `usingReference`: la pantalla muestra contenido, pero no es el del servidor.
   */
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const rows = await loader();
      const referenceItems = fallbackRef.current;
      setItems(rows.length ? rows : referenceItems);
      setUsingReference(!rows.length && referenceItems.length > 0);
    } catch (requestError) {
      const referenceItems = fallbackRef.current;
      setError(requestError.message);
      setItems(referenceItems);
      setUsingReference(referenceItems.length > 0);
    } finally { setLoading(false); }
  }, [loader]);
  useEffect(() => { reload(); }, [reload]);
  return { items, loading, error, usingReference, reload, setItems };
}
