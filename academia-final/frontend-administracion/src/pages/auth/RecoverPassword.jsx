import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components/common';
import { authService } from '@/services/authService';

export default function RecoverPassword() {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await authService.forgotPassword(email);
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };
  return <div className="auth-card"><p className="eyebrow">Recuperar acceso</p><h2>Restablece tu contraseña</h2><p>Te enviaremos instrucciones mediante el servicio de notificaciones.</p><form onSubmit={submit}><Input label="Correo electrónico" type="email" value={email} onChange={(event)=>setEmail(event.target.value)} required autoComplete="email" />{notice&&<div className="alert alert--success" role="status">{notice}</div>}{error&&<div className="alert alert--error" role="alert">{error}</div>}<Button type="submit" disabled={loading}>{loading?'Enviando…':'Enviar instrucciones'}</Button></form><Link to="/login">Volver al ingreso</Link></div>;
}
