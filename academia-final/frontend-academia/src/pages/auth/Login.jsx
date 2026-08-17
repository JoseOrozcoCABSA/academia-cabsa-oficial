/**
 * @file Componente `Login`.
 *
 * Fija el título del documento a «Iniciar sesión — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Inicio de sesion de la academia.
 *
 * El campo de identidad acepta correo o nombre de usuario, y la casilla de
 * «recordarme» decide si la sesion se guarda en `localStorage` o en
 * `sessionStorage`.
 */
export default function Login() {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Iniciar sesión — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  /**
   * Autentica y vuelve a donde el usuario queria ir.
   *
   * El destino viene en `location.state.from`, que puso la guarda de ruta al
   * interceptar el acceso; si no hay, va al inicio. Se navega con `replace` para
   * que el retroceso no regrese al formulario.
   */
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await login(identity, password, remember);
      navigate(location.state?.from || '/', { replace: true });
    } catch (requestError) {
      if (requestError.code === 'EMAIL_VERIFICATION_REQUIRED') {
        navigate(`/verificar-cuenta?email=${encodeURIComponent(identity)}`, {
          state: { message: requestError.message },
        });
        return;
      }
      setError(requestError.message);
    }
  };

  return (
    <section className="auth-cabsa-card">
      <span className="auth-cabsa-icon" aria-hidden="true"><LogIn /></span>
      <p className="eyebrow">Academia CABSA</p>
      <h1>Iniciar sesión</h1>
      <p className="auth-cabsa-intro">
        Accede a tus cápsulas, cursos, foros y avance de aprendizaje.
      </p>

      {location.state?.message && (
        <div className="auth-cabsa-success" role="status">{location.state.message}</div>
      )}
      {error && <div className="auth-cabsa-errors" role="alert">{error}</div>}

      <form className="auth-cabsa-form" onSubmit={submit}>
        <label>
          Correo electrónico o usuario
          <input
            value={identity}
            autoComplete="username"
            autoFocus
            required
            onChange={(event) => setIdentity(event.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            value={password}
            type="password"
            autoComplete="current-password"
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="auth-cabsa-check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          Recordarme en este equipo
        </label>
        <button className="auth-cabsa-button" disabled={loading} type="submit">
          {loading ? 'Ingresando…' : 'Entrar'}
        </button>
      </form>

      <p className="auth-cabsa-footer">
        ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </section>
  );
}
