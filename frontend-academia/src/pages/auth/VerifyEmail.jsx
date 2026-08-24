import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState(() => (params.get('code') || '').replace(/\D/g, '').slice(0, 6));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resending, setResending] = useState(false);
  const [automaticVerification, setAutomaticVerification] = useState(false);
  const automaticAttempted = useRef(false);
  const { verifyEmail, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Verificar cuenta — Academia CABSA';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (automaticAttempted.current || !email || code.length !== 6 || !params.get('code')) return;
    automaticAttempted.current = true;
    setAutomaticVerification(true);
    setError('');
    verifyEmail(email, code)
      .then(() => {
        navigate('/perfil', {
          replace: true,
          state: { message: 'Tu correo fue confirmado y tu cuenta está activa.' },
        });
      })
      .catch((requestError) => {
        setError(requestError.message);
        setAutomaticVerification(false);
      });
  }, [code, email, navigate, params, verifyEmail]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await verifyEmail(email, code);
      navigate('/perfil', {
        replace: true,
        state: { message: 'Tu correo fue verificado y tu cuenta está activa.' },
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const resend = async () => {
    setError('');
    setNotice('');
    setResending(true);
    try {
      const result = await authService.resendVerification(email);
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="auth-cabsa-card">
      <span className="auth-cabsa-icon" aria-hidden="true"><MailCheck /></span>
      <p className="eyebrow">Seguridad de cuenta</p>
      <h1>Verifica tu correo</h1>
      <p className="auth-cabsa-intro">
        {automaticVerification
          ? 'Confirmando tu correo y activando tu cuenta…'
          : 'Abre el botón enviado por correo o captura el código de seis dígitos. Vence en 15 minutos.'}
      </p>
      {(location.state?.message || notice) && <div className="auth-cabsa-success" role="status">{notice || location.state.message}</div>}
      {error && <div className="auth-cabsa-errors" role="alert">{error}</div>}
      <form className="auth-cabsa-form" onSubmit={submit}>
        <label>
          Correo electrónico
          <input type="email" value={email} required autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Código de activación
          <input value={code} required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
        </label>
        <button className="auth-cabsa-button" disabled={loading || automaticVerification || code.length !== 6} type="submit">
          {loading ? 'Verificando…' : 'Activar mi cuenta'}
        </button>
      </form>
      <button className="auth-cabsa-button auth-cabsa-button--secondary" type="button" disabled={resending || !email} onClick={resend}>
        {resending ? 'Enviando…' : 'Reenviar código'}
      </button>
      <p className="auth-cabsa-footer"><Link to="/login">Volver a iniciar sesión</Link></p>
    </section>
  );
}
