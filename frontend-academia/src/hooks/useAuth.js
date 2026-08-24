/**
 * @file Reexporta `useAuth` para poder importarlo desde `hooks/`.
 *
 * No añade lógica: la implementación está en el contexto. Existe para que los
 * componentes importen de `@/hooks/useAuth` en lugar de acoplarse a la ruta del
 * contexto.
 *
 * @see context/AuthContext.jsx
 */

export { useAuth } from '@/context/AuthContext';
