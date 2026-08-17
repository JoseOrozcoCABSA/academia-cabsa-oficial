import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Input } from '@/components/common';
import { authService } from '@/services/authService';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await authService.resetPassword({
        email, token, password, passwordConfirmation: confirmation,
      });
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };
  if (!email || !token) return <div className="auth-card"><h2>Enlace inválido</h2><p>Solicita un nuevo correo de recuperación.</p><Link to="/recuperar">Solicitar enlace</Link></div>;
  return <div className="auth-card"><p className="eyebrow">Recuperar acceso</p><h2>Define tu nueva contraseña</h2>{notice?<><div className="alert alert--success" role="status">{notice}</div><Link to="/login">Ir al ingreso</Link></>:<form onSubmit={submit}><Input label="Nueva contraseña" type="password" minLength="8" value={password} onChange={(event)=>setPassword(event.target.value)} required autoComplete="new-password" /><Input label="Confirmar contraseña" type="password" minLength="8" value={confirmation} onChange={(event)=>setConfirmation(event.target.value)} required autoComplete="new-password" />{error&&<div className="alert alert--error" role="alert">{error}</div>}<Button type="submit" disabled={loading}>{loading?'Actualizando…':'Actualizar contraseña'}</Button></form>}</div>;
}

