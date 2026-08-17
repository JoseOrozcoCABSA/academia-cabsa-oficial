/**
 * @file Componente `Navbar`.
 *
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
/**
 * Barra superior con el nombre del usuario y el cierre de sesion.
 *
 * El nombre tiene alternativas en cadena por si el perfil esta incompleto, de
 * modo que nunca queda vacio. El boton del menu solo se ve en pantallas
 * estrechas.
 */
export default function Navbar() {
  const { setSidebarOpen } = useApp(); const { user, logout } = useAuth();
  const name = user?.display_name || user?.username || 'Administrador';
  return <header className="navbar"><button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)}><Menu/></button><label className="search"><Search/><input placeholder="Buscar en la administración" /></label><div className="navbar-actions"><span className="environment-tag">LOCAL</span><button className="icon-button"><Bell/></button><div className="user-chip"><span>{name[0].toUpperCase()}</span><div><strong>{name}</strong><small>Operador CABSA</small></div></div><button className="icon-button" onClick={logout}><LogOut/></button></div></header>;
}
