/**
 * @file Componente `Navbar`.
 *
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { Menu, Bell, Search, LogOut } from 'lucide-react';
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
  const { setSidebarOpen } = useApp();
  const { user, logout } = useAuth();
  const name = user?.display_name || user?.username || 'Usuario CABSA';
  return <header className="navbar">
    <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu /></button>
    <label className="search"><Search /><input aria-label="Buscar" placeholder="Buscar cursos, cápsulas o recursos" /></label>
    <div className="navbar-actions"><button className="icon-button" aria-label="Notificaciones"><Bell /></button><div className="user-chip"><span>{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>Comunidad CABSA</small></div></div><button className="icon-button" onClick={logout} aria-label="Cerrar sesión"><LogOut /></button></div>
  </header>;
}
