/**
 * @file Componente `Sidebar`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Library, Sparkles, TrendingUp, Award, LifeBuoy, UserRound, X } from 'lucide-react';
import logo from '@/assets/logo/logo-horizontal.svg';
import { useApp } from '@/context/AppContext';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';

const items = [
  ['/', 'Inicio', Home, null], ['/cursos', 'Mis cursos', BookOpen, 'courses'], ['/mediateca', 'Mediateca', Library, 'media'],
  ['/asistentes', 'Asistentes IA', Sparkles, 'assistants'], ['/progreso', 'Mi progreso', TrendingUp, 'progress'],
  ['/certificados', 'Certificados', Award, 'progress'], ['/soporte', 'Soporte', LifeBuoy, 'support'], ['/perfil', 'Mi perfil', UserRound, null],
];
/**
 * Menu lateral de navegacion.
 *
 * En pantallas estrechas se muestra u oculta con el estado del contexto de
 * interfaz; en pantallas anchas esta siempre visible y la clase no influye.
 *
 * Los enlaces salen de una lista fija declarada en este archivo, no de los
 * permisos del usuario: aqui aparecen todas las secciones y el control de acceso
 * lo hacen las guardas de ruta.
 */
export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const { allowed } = useMembershipAccess();
  return <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
    <div className="sidebar-brand"><img src={logo} alt="Academia CABSA" /><button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)}><X /></button></div>
    <p className="sidebar-label">Mi aprendizaje</p>
    <nav>{items.filter(([, , , section]) => !section || allowed(section)).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setSidebarOpen(false)}><Icon /><span>{label}</span></NavLink>)}</nav>
    {allowed('support') && <div className="sidebar-foot"><strong>¿Necesitas ayuda?</strong><p>El equipo CABSA está para acompañarte.</p><NavLink to="/soporte">Abrir soporte</NavLink></div>}
  </aside>;
}
