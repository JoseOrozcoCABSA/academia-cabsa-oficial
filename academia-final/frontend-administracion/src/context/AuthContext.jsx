/**
 * @file Contexto de autenticacion del panel de administracion.
 *
 * Unica pieza que escribe el token y el usuario en el navegador; `apiClient`
 * solo los lee.
 *
 * A diferencia del frontend de academia aqui **no hay opcion de recordarme**:
 * siempre se usa `localStorage`, asi que la sesion sobrevive al cierre del
 * navegador. Al ser almacenamiento accesible por JavaScript queda expuesto a un
 * XSS; la alternativa seria una cookie `HttpOnly`, que exigiria cambios en el
 * gateway.
 *
 * @see services/apiClient.js Lectura del token y evento `cabsa:unauthorized`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { TOKEN_KEY, USER_KEY } from '@/config/constants';

/**
 * Contexto con valor inicial `null`: usar `useAuth()` fuera de
 * {@link AuthProvider} devuelve `null` y cualquier desestructuracion lanza, sin
 * un mensaje que explique la causa.
 */
const AuthContext = createContext(null);
/**
 * Recupera el usuario guardado.
 *
 * El `try` cubre el caso de un valor corrupto en el almacenamiento: devuelve
 * `null` en vez de impedir el arranque de la aplicacion.
 */
const storedUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};

/**
 * Provee la sesion a todo el arbol.
 *
 * El usuario se inicializa de forma perezosa desde `localStorage`, de modo que
 * al recargar la sesion se mantiene sin volver a pedir credenciales.
 *
 * La sesion rehidratada se valida contra `/auth/me` al montar el proveedor.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const [loading, setLoading] = useState(false);

  /**
   * Guarda token y usuario, y refresca el estado.
   *
   * @param {{token: string, user: object}} session Respuesta del inicio de sesion.
   */
  const persist = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setUser(session.user);
  }, []);

  /**
   * Cierra la sesion en el navegador.
   *
   * **No avisa al servidor**: el token sigue siendo valido hasta que caduque.
   * Revocarlo de verdad exigiria una lista de invalidacion en el backend.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!storedUser() || !localStorage.getItem(TOKEN_KEY)) return undefined;
    let active = true;
    setLoading(true);
    authService.me()
      .then((authorization) => {
        if (!active) return;
        const nextUser = { ...storedUser(), roles: authorization.roles || [], permissions: authorization.permissions || [] };
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser)); setUser(nextUser);
      })
      .catch(() => { if (active) logout(); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [logout]);

  /**
   * Inicia sesion y persiste el resultado. `identity` acepta correo o nombre de
   * usuario.
   *
   * No captura el error: quien llame debe mostrarlo. El `finally` garantiza que
   * `loading` vuelva a `false` aunque falle.
   */
  const login = useCallback(async (identity, password) => {
    setLoading(true);
    try {
      const session = await authService.login(identity, password);
      persist(session);
      return session;
    } finally { setLoading(false); }
  }, [persist]);

  /** Registra la cuenta y deja la sesion iniciada, igual que {@link login}. */
  const register = useCallback(async (values) => {
    setLoading(true);
    try {
      const session = await authService.register(values);
      persist(session);
      return session;
    } finally { setLoading(false); }
  }, [persist]);

  useEffect(() => {
    /** Cierra la sesion cuando `apiClient` detecta un 401. */
    const unauthorized = () => logout();
    window.addEventListener('cabsa:unauthorized', unauthorized);
    return () => window.removeEventListener('cabsa:unauthorized', unauthorized);
  }, [logout]);

  /**
   * Valor del contexto.
   *
   * `isAuthenticated` exige usuario **y** token presente. Se lee del
   * almacenamiento dentro del memo, asi que un borrado externo del token no se
   * detecta hasta el siguiente recalculo.
   */
  const value = useMemo(() => ({
    user, loading, isAuthenticated: Boolean(user && localStorage.getItem(TOKEN_KEY)),
    login, register, logout,
  }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Acceso a la sesion. Devuelve `null` fuera de {@link AuthProvider}. */
export const useAuth = () => useContext(AuthContext);
