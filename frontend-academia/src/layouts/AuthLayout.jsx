/**
 * @file Componente `AuthLayout`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { Outlet } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import '@/auth-cabsa.css';

/**
 * Marco de las pantallas de acceso.
 *
 * Pinta la identidad de marca y deja el formulario en el `Outlet`, de forma que
 * inicio de sesion, registro y recuperacion comparten presentacion.
 */
export default function AuthLayout() {
  return (
    <div className="auth-cabsa-public">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />
      <main id="contenido" className="auth-cabsa-page">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
