/**
 * @file Contexto de interfaz: menu lateral y aviso global.
 *
 * Separado del contexto de autenticacion a proposito: aqui solo vive estado de
 * presentacion, que no debe provocar renderizados en el arbol cuando cambie la
 * sesion.
 */

import { createContext, useContext, useMemo, useState } from 'react';

const AppContext = createContext(null);
/**
 * Estado de interfaz compartido: apertura del menu lateral y aviso global.
 *
 * No guarda nada de la sesion ni de los datos; para eso esta el contexto de
 * autenticacion. Al no persistir, el menu vuelve a su estado inicial en cada
 * recarga.
 */
export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  /**
   * Valor del contexto.
   *
   * Las dependencias son los dos estados y no los `set*`, que React garantiza
   * estables. Sin el memo, cada render del proveedor volveria a renderizar todo
   * el arbol que lo consume.
   */
  const value = useMemo(() => ({ sidebarOpen, setSidebarOpen, notice, setNotice }), [sidebarOpen, notice]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
/** Acceso al estado de interfaz. Devuelve `null` fuera de {@link AppProvider}. */
export const useApp = () => useContext(AppContext);
