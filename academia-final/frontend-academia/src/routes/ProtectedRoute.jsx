/**
 * @file Guarda de ruta: exige sesión iniciada.
 *
 * Es una comprobación de interfaz, no de seguridad: quien manipule el estado del
 * navegador puede renderizar la pantalla. La autorización real la aplica cada
 * servicio al recibir la petición.
 *
 * @see RoleRoute.jsx Restricción adicional por rol.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Renderiza los hijos si hay sesión; si no, redirige a `/login`.
 *
 * Guarda la ruta de origen en `state.from` para poder volver tras el inicio de
 * sesión, y usa `replace` para no dejar la ruta protegida en el historial.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
