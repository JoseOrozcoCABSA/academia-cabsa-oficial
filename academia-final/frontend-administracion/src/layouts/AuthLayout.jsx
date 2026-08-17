/**
 * @file Componente `AuthLayout`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { Outlet } from 'react-router-dom';
import logo from '@/assets/logo/logo-horizontal.svg';
/**
 * Marco de las pantallas de acceso.
 *
 * Pinta la identidad de marca y deja el formulario en el `Outlet`, de forma que
 * inicio de sesion, registro y recuperacion comparten presentacion.
 */
export default function AuthLayout() {
  return <main className="auth-layout"><section className="auth-brand">
    <img src={logo} alt="Academia CABSA" />
    <p className="eyebrow">Tecnologías inteligentes</p>
    <h1>Aprendizaje que conecta personas, conocimiento e inteligencia artificial.</h1>
    <p>Una experiencia unificada para estudiantes, docentes, familias y administradores.</p>
  </section><section className="auth-panel"><Outlet /></section></main>;
}
