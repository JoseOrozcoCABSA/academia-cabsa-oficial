/**
 * @file Contexto de autenticación: sesión, token y usuario en curso.
 *
 * Es la única pieza que escribe el token y el usuario en el almacenamiento del
 * navegador. `apiClient` sólo los lee.
 *
 * El token se guarda en `localStorage` o en `sessionStorage` según la casilla de
 * «recordarme». Al estar en almacenamiento accesible por JavaScript, queda
 * expuesto a un XSS: cualquier script inyectado en la página puede leerlo. La
 * alternativa sería una cookie `HttpOnly`, que exigiría cambios en el gateway.
 *
 * @see services/apiClient.js Lectura del token y evento `cabsa:unauthorized`.
 * @see routes/ProtectedRoute.jsx Guarda que consume `isAuthenticated`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { TOKEN_KEY, USER_KEY } from '@/config/constants';

/**
 * Contexto con valor inicial `null`.
 *
 * Consecuencia: usar `useAuth()` fuera de {@link AuthProvider} devuelve `null` y
 * cualquier desestructuración lanza. No hay comprobación que lo avise con un
 * mensaje claro.
 */
const AuthContext = createContext(null);
/**
 * Recupera el usuario guardado, mirando primero `localStorage` y luego
 * `sessionStorage`.
 *
 * El `try` protege del caso en que el valor almacenado esté corrupto: devuelve
 * `null` en lugar de romper el arranque de la aplicación.
 */
const storedUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem(USER_KEY)
      || sessionStorage.getItem(USER_KEY),
    );
  } catch {
    return null;
  }
};

/**
 * Provee la sesión a todo el árbol.
 *
 * El usuario se inicializa de forma perezosa desde el almacenamiento, así que al
 * recargar la página la sesión sobrevive sin pedir credenciales de nuevo.
 *
 * La sesion rehidratada se valida contra `/auth/me` al montar el proveedor.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const [loading, setLoading] = useState(false);

  /**
   * Guarda la sesión, limpiando antes los dos almacenamientos.
   *
   * Borrar en ambos evita quedar con un token en `localStorage` y otro en
   * `sessionStorage`, situación en la que `apiClient` usaría el primero que
   * encontrara y podría enviar el equivocado.
   *
   * @param {{token: string, user: object}} session Respuesta del inicio de sesión.
   * @param {boolean} [remember=true] `true` persiste entre cierres del navegador.
   */
  const persist = useCallback((session, remember = true) => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, session.token);
    storage.setItem(USER_KEY, JSON.stringify(session.user));
    setUser(session.user);
  }, []);

  /**
   * Cierra la sesión localmente.
   *
   * Sólo limpia el navegador: **no avisa al servidor**. El token sigue siendo
   * válido hasta que caduque, así que quien lo hubiera copiado podría seguir
   * usándolo. Revocarlo de verdad exigiría una lista de invalidación en el
   * backend.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
      || sessionStorage.getItem(TOKEN_KEY);
    if (!storedUser() || !token) return undefined;
    let active = true;
    setLoading(true);
    authService.me()
      .then((authorization) => {
        if (!active) return;
        const nextUser = { ...storedUser(), roles: authorization.roles || [], permissions: authorization.permissions || [] };
        const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
        storage.setItem(USER_KEY, JSON.stringify(nextUser)); setUser(nextUser);
      })
      .catch(() => { if (active) logout(); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [logout]);

  /**
   * Actualiza los datos del usuario conservando dónde estaba la sesión.
   *
   * Decide el almacenamiento según dónde esté el token, para no mover la sesión
   * de `sessionStorage` a `localStorage` al editar el perfil.
   */
  const updateUser = useCallback((nextUser) => {
    const storage = localStorage.getItem(TOKEN_KEY)
      ? localStorage
      : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  /**
   * Inicia sesión y persiste el resultado.
   *
   * `identity` acepta correo o nombre de usuario. Por defecto **no** recuerda la
   * sesión, de modo que se guarda en `sessionStorage` y se pierde al cerrar la
   * pestaña.
   *
   * No captura el error: quien llame debe mostrarlo. El `finally` garantiza que
   * `loading` vuelva a `false` incluso si falla.
   */
  const login = useCallback(async (identity, password, remember = false) => {
    setLoading(true);
    try {
      const session = await authService.login(identity, password, remember);
      persist(session, remember);
      return session;
    } finally { setLoading(false); }
  }, [persist]);

  /**
   * Registra la cuenta y deja la sesión iniciada.
   *
   * Persiste con `remember` por omisión, es decir en `localStorage`: tras el alta
   * la sesión sobrevive al cierre del navegador, a diferencia del inicio de
   * sesión normal.
   */
  const register = useCallback(async (values) => {
    setLoading(true);
    try {
      const session = await authService.register(values);
      if (session.token) persist(session);
      return session;
    } finally { setLoading(false); }
  }, [persist]);

  const verifyEmail = useCallback(async (email, code) => {
    setLoading(true);
    try {
      const session = await authService.verifyEmail(email, code);
      persist(session);
      return session;
    } finally { setLoading(false); }
  }, [persist]);

  useEffect(() => {
    /** Cierra la sesión cuando `apiClient` detecta un 401. */
    const unauthorized = () => logout();
    window.addEventListener('cabsa:unauthorized', unauthorized);
    return () => window.removeEventListener('cabsa:unauthorized', unauthorized);
  }, [logout]);

  /**
   * Valor del contexto.
   *
   * `isAuthenticated` exige usuario **y** token presente: no basta con tener el
   * usuario en memoria. Aun así se lee del almacenamiento en cada render del
   * memo, así que un borrado externo del token no se detecta hasta el siguiente
   * recálculo.
   */
  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(
      user
      && (
        localStorage.getItem(TOKEN_KEY)
        || sessionStorage.getItem(TOKEN_KEY)
      ),
    ),
    login, register, verifyEmail, logout, updateUser,
  }), [user, loading, login, register, verifyEmail, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Acceso a la sesión desde cualquier componente.
 *
 * Devuelve `null` si se usa fuera del proveedor.
 */
export const useAuth = () => useContext(AuthContext);
