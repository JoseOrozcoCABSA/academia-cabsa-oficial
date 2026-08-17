/**
 * @file Guarda de ruta por rol.
 *
 * @see ProtectedRoute.jsx Debe envolver a esta: aquí no se comprueba la sesión.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Renderiza los hijos si el rol del usuario está en la lista.
 *
 * Lee el rol de tres formas distintas (`role.name`, `role`, `role_name`) porque
 * la forma del usuario no es homogénea según de dónde venga.
 *
 * **Atención — la guarda permite el paso cuando falta el rol.** La condición es
 * «si no hay rol, o la lista está vacía, o el rol está incluido». Es decir, un
 * usuario cuyo objeto no traiga rol reconocible entra a cualquier pantalla
 * restringida. Si la intención era lo contrario, la condición debería exigir que
 * el rol exista y esté en la lista.
 *
 * Como en toda guarda de cliente, la protección efectiva la da el servicio: esto
 * sólo evita mostrar la pantalla.
 */
export default function RoleRoute({ roles = [], children }) {
  const { user } = useAuth();
  const assigned = user?.roles || [];
  const legacyRole = user?.role?.name || user?.role || user?.role_name;
  const normalized = [...assigned, legacyRole].filter(Boolean).map((role) => String(role));
  if (roles.length === 0 || normalized.some((role) => roles.includes(role))) return children;
  return <Navigate to="/" replace />;
}
