import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import horizontalLogo from '@/assets/logo/logo-horizontal.svg';
import { useAuth } from '@/hooks/useAuth';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import '@/components/public/header-footer.css';

export default function Header() {
  const headerRef = useRef(null);
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const { profile, active: membershipActive, allowed } = useMembershipAccess();
  const displayName = user?.display_name
    || user?.name
    || user?.first_name
    || user?.firstName
    || user?.username
    || 'Mi cuenta';
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const isCurrent = (prefix) => location.pathname.startsWith(prefix);

  const closeMenus = () => {
    headerRef.current?.querySelectorAll('details[open]').forEach((menu) => {
      menu.removeAttribute('open');
    });
  };

  useEffect(() => {
    closeMenus();
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!headerRef.current?.contains(event.target)) closeMenus();
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeMenus();
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const closeAfterLink = (event) => {
    if (event.target.closest('a')) closeMenus();
  };

  return (
    <header className={`site-header${isAuthenticated ? '' : ' site-header--guest'}`} ref={headerRef} onClick={closeAfterLink}>
      <div className="header-inner">
        <Link className="brand" to="/">
          <img src={horizontalLogo} alt="Academia CABSA" />
        </Link>

        {isAuthenticated && <nav aria-label="Navegación principal">
          <Link className={location.pathname === '/' ? 'active' : ''} aria-current={location.pathname === '/' ? 'page' : undefined} to="/">Inicio</Link>

          {(allowed('assistants') || allowed('tutors')) && <details>
            <summary className={isCurrent('/ai/') || isCurrent('/asistentes') ? 'active' : ''}>Herramientas IA</summary>
            <div className="dropdown">
              {allowed('assistants') && <details className="nested-menu">
                <summary>Asistentes NEM</summary>
                <div className="nested-dropdown">
                  <Link to="/ai/asistentes/preescolar">Asistentes Preescolar</Link>
                  <Link to="/ai/asistentes/primaria">Asistentes Primaria</Link>
                  <Link to="/ai/asistentes/secundaria">Asistentes Secundaria</Link>
                </div>
              </details>}
              {allowed('tutors') && <details className="nested-menu">
                <summary>Tutores NEM</summary>
                <div className="nested-dropdown">
                  <Link to="/ai/tutores/preescolar">Tutores Preescolar</Link>
                  <Link to="/ai/tutores/primaria">Tutores Primaria</Link>
                  <Link to="/ai/tutores/secundaria">Tutores Secundaria</Link>
                </div>
              </details>}
              {allowed('assistants') && <details className="nested-menu">
                <summary>Otros</summary>
                <div className="nested-dropdown"><Link to="/agentes-gpt">Agentes GPT</Link></div>
              </details>}
            </div>
          </details>}

          {allowed('media') && <Link className={isCurrent('/mediateca') || isCurrent('/capsulas') ? 'active' : ''} to="/mediateca">Mediateca</Link>}
          {allowed('courses') && <Link className={isCurrent('/cursos') ? 'active' : ''} to="/cursos">Cursos</Link>}

          {allowed('forums') && <details className="forums-menu">
            <summary className={isCurrent('/foros') ? 'active' : ''}>Foros</summary>
            <div className="dropdown forums-dropdown">
              <Link to="/foros">Todos los foros</Link>
            </div>
          </details>}
        </nav>}

        {isAuthenticated ? (
          <details className="profile-menu">
            <summary className="profile"><span>{initials}</span><b>{displayName}</b></summary>
            <div className="profile-dropdown">
              <Link to="/perfil">Mi perfil</Link>
              {membershipActive && <Link to="/activar-beca">Mi beca</Link>}
              {profile && !membershipActive && <Link to="/activar-beca">Activar beca</Link>}
              <div className="profile-logout-form"><button type="button" onClick={logout}>Salir</button></div>
            </div>
          </details>
        ) : (
          <details className="profile-menu">
            <summary className="profile"><span>?</span><b>Iniciar sesión</b></summary>
            <div className="profile-dropdown">
              <Link to="/login">Iniciar sesión</Link>
              <Link to="/registro">Registrarse</Link>
            </div>
          </details>
        )}
      </div>
    </header>
  );
}
