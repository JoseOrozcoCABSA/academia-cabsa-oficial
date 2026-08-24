import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services/profileService';
import '@/profile-cabsa.css';

const formatDate = (value, fallback = 'No disponible') => {
  if (!value || String(value).startsWith('1900-01-01')) return fallback;
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(value));
};

export default function ProfilePage() {
  const { user: sessionUser } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [groupAccess, setGroupAccess] = useState({ canManage: false, groups: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notice = location.state?.message || '';

  const load = useCallback(async () => {
    try {
      const [profileResult, groupResult] = await Promise.all([
        profileService.get(),
        profileService.getManagedGroup().catch(() => ({ canManage: false })),
      ]);
      setProfile(profileResult);
      setGroupAccess(groupResult);
    } catch (requestError) {
      setError(requestError.message);
      setProfile({ user: sessionUser, membership: { name: 'Sin información disponible', status: 'INACTIVE' }, group: null });
    } finally {
      setLoading(false);
    }
  }, [sessionUser]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Mi cuenta CABSA — Academia CABSA';
    return () => { document.title = previousTitle; };
  }, []);

  const user = profile?.user || sessionUser;
  const displayName = user?.display_name || user?.username || 'Usuario CABSA';

  return <div className="profile-cabsa-public">
    <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
    <Header />
    <main id="contenido">
      {loading ? <div className="profile-cabsa-state"><Loader label="Cargando tu cuenta" /></div> :
        <section className="profile-cabsa-page">
          {notice && <div className="profile-cabsa-message" role="status">{notice}</div>}
          {error && <div className="profile-cabsa-alert" role="alert">{error}</div>}
          <header className="profile-cabsa-hero">
            <p className="eyebrow">Cuenta Academia CABSA</p>
            <h1>Mi cuenta CABSA</h1>
            <p>Administra tus datos personales, contraseña, beca y accesos de la plataforma.</p>
          </header>
          <div className="profile-cabsa-stats">
            <div><span>Usuario</span><strong>{displayName}</strong></div>
            <div><span>Membresía / beca</span><strong>{profile?.membership?.name || 'Sin beca activa'}{profile?.membership?.status === 'SUSPENDED' ? ' · Suspendida temporalmente' : ''}</strong></div>
            <div><span>Fecha de activación</span><strong>{formatDate(profile?.membership?.activatedAt)}</strong></div>
          </div>
          <section className="profile-cabsa-card">
            <div className="profile-cabsa-account">
              <span className="profile-cabsa-avatar" aria-hidden="true">{displayName.trim().slice(0, 2).toUpperCase()}</span>
              <div>
                <p className="eyebrow">Información de la cuenta</p><h2>{displayName}</h2>
                <dl>
                  <div><dt>Usuario</dt><dd>{user?.username || 'No disponible'}</dd></div>
                  <div><dt>Correo electrónico</dt><dd>{user?.email || 'No disponible'}</dd></div>
                  {user?.phone && <div><dt>Teléfono</dt><dd>{user.phone}</dd></div>}
                </dl>
              </div>
            </div>
            <div className="profile-cabsa-actions">
              {profile?.membership?.status === 'INACTIVE' && <Link className="profile-cabsa-button" to="/activar-beca">Activar código de beca</Link>}
              <Link className="profile-cabsa-button" to="/perfil/editar">Editar perfil</Link>
              <Link className="profile-cabsa-button profile-cabsa-button--secondary" to="/perfil/editar#cambiar-contrasena">Cambiar contraseña</Link>
              {groupAccess.canManage && <Link className="profile-cabsa-button profile-cabsa-button--secondary" to="/mis-alumnos">Administrar grupo{groupAccess.groups?.[0] ? ` · ${groupAccess.groups[0].availableSeats} de ${groupAccess.groups[0].seatLimit} lugares` : ''}</Link>}
            </div>
          </section>
        </section>}
    </main>
    <Footer />
  </div>;
}
