/**
 * @file Componente `LegalPage`.
 *
 * Fija el título del documento a «${title} — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 */

import { useEffect } from 'react';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import '@/legal.css';

/**
 * Marco de las paginas legales: fija el titulo del documento y lo restaura al
 * salir. El texto llega como hijos.
 */
export default function LegalPage({ title, children }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} — Academia CABSA`;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="legal-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />
      <main id="contenido">
        <article className="legal">
          <h1>{title}</h1>
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}
