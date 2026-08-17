/**
 * @file Componente `MainLayout`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import Navbar from '@/components/navigation/Navbar';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
/**
 * Marco de las pantallas internas: menu lateral, barra superior y contenido.
 *
 * No comprueba la sesion; de eso se encargan las guardas de ruta que lo
 * envuelven.
 */
export default function MainLayout() {
  return <div className="app-shell"><Sidebar /><div className="app-area"><Navbar /><main id="main-content"><Breadcrumbs /><Outlet /></main></div></div>;
}
