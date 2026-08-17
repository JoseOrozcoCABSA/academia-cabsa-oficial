import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { profileService } from '@/services/profileService';
import './membership-route.css';

let cachedProfile = null;
let cachedAt = 0;
const loadProfile = async () => {
  if (cachedProfile && Date.now() - cachedAt < 30000) return cachedProfile;
  cachedProfile = await profileService.get(); cachedAt = Date.now(); return cachedProfile;
};
export const clearMembershipAccessCache = () => { cachedProfile = null; cachedAt = 0; };

export default function MembershipRoute({ section, children }) {
  const [state, setState] = useState({ loading: true, profile: null, error: '' });
  useEffect(() => { let active = true; loadProfile().then((profile) => { if (active) setState({ loading: false, profile, error: '' }); }).catch((error) => { if (active) setState({ loading: false, profile: null, error: error.message }); }); return () => { active = false; }; }, [section]);
  if (state.loading) return <div className="membership-gate"><div className="card"><span className="spinner" /><p>Validando acceso a la sección…</p></div></div>;
  const membership = state.profile?.membership;
  if (membership?.status === 'ACTIVE' && state.profile?.access?.sections?.[section] === true) return children;
  const suspended = membership?.status === 'SUSPENDED'; const inactive = !membership || membership.status === 'INACTIVE';
  return <div className="membership-gate"><section className="card membership-gate-card"><LockKeyhole /><p className="eyebrow">Acceso restringido</p><h1>{suspended ? 'Tu beca está suspendida' : inactive ? 'Necesitas una beca activa' : 'Esta sección no está incluida'}</h1><p>{state.error || (suspended ? 'Un administrador desactivó temporalmente los beneficios. Tu cuenta y tu historial permanecen guardados.' : inactive ? 'Activa un código de beca para entrar a los recursos de la Academia.' : 'Tu tipo de beca no tiene acceso a esta sección. Si consideras que es un error, contacta al administrador.')}</p><div><Link className="button" to={inactive ? '/activar-beca' : '/perfil'}>{inactive ? 'Activar beca' : 'Ver mi perfil'}</Link><Link className="button button--secondary" to="/">Volver al inicio</Link></div></section></div>;
}
