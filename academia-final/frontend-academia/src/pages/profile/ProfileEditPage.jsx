/**
 * @file Componente `ProfileEditPage`.
 *
 * Fija el título del documento a «Editar perfil — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 * Consume: `profileService`.
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services/profileService';
import '@/profile-cabsa.css';

const emptyProfile = {
  displayName: '',
  firstName: '',
  lastName: '',
  phone: '',
};

const emptyPassword = {
  currentPassword: '',
  password: '',
  passwordConfirmation: '',
};

/**
 * Edicion del perfil y cambio de contrasena, en dos formularios independientes.
 *
 * Cada uno se envia y falla por separado, de modo que un error al cambiar la
 * contrasena no descarta los datos del perfil.
 */
export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [password, setPassword] = useState(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let active = true;
    profileService.get()
      .then((result) => {
        if (!active) return;
        setProfile({
          displayName: result.user?.display_name || '',
          firstName: result.user?.first_name || '',
          lastName: result.user?.last_name || '',
          phone: result.user?.phone || '',
          username: result.user?.username || '',
          email: result.user?.email || '',
        });
      })
      .catch((requestError) => {
        if (active) setProfileError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Editar perfil — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  /** Genera el manejador de un campo del perfil. */
  const changeProfile = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };

  /** Genera el manejador de un campo del formulario de contrasena. */
  const changePassword = (field) => (event) => {
    setPassword((current) => ({ ...current, [field]: event.target.value }));
  };

  /**
   * Guarda el perfil y actualiza la sesion.
   *
   * Tras guardar refresca el usuario del contexto, para que la barra superior
   * muestre el nombre nuevo sin recargar.
   *
   * Aviso: se envian todos los campos del formulario porque el backend pone a
   * nulo lo que no llegue.
   */
  const submitProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    try {
      const result = await profileService.update(profile);
      updateUser(result.user);
      navigate('/perfil', {
        replace: true,
        state: { message: 'Tu perfil se actualizó correctamente.' },
      });
    } catch (requestError) {
      setProfileError(requestError.message);
    } finally {
      setSavingProfile(false);
    }
  };

  /**
   * Cambia la contrasena.
   *
   * La sesion **no** se cierra al terminar: el token sigue valido, aqui y en
   * cualquier otro dispositivo donde estuviera abierta.
   */
  const submitPassword = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError('');
    try {
      await profileService.updatePassword(password);
      navigate('/perfil', {
        replace: true,
        state: { message: 'Tu contraseña se actualizó correctamente.' },
      });
    } catch (requestError) {
      setPasswordError(requestError.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="profile-cabsa-public">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        {loading ? (
          <div className="profile-cabsa-state"><Loader label="Cargando tu perfil" /></div>
        ) : (
          <section className="profile-cabsa-page profile-cabsa-edit">
            <Link className="profile-cabsa-back" to="/perfil">← Volver a mi cuenta</Link>

            <header className="profile-cabsa-card">
              <p className="eyebrow">Cuenta Academia CABSA</p>
              <h1>Editar perfil</h1>
              <p>Actualiza los datos que se muestran en tu cuenta CABSA.</p>
            </header>

            <section className="profile-cabsa-card">
              <h2>Datos personales</h2>
              {profileError && <div className="profile-cabsa-alert" role="alert">{profileError}</div>}
              <form className="profile-cabsa-form" onSubmit={submitProfile}>
                <label>
                  Nombre visible
                  <input
                    value={profile.displayName}
                    maxLength={255}
                    required
                    onChange={changeProfile('displayName')}
                  />
                </label>
                <div className="profile-cabsa-form-grid">
                  <label>
                    Nombre
                    <input
                      value={profile.firstName}
                      maxLength={120}
                      onChange={changeProfile('firstName')}
                    />
                  </label>
                  <label>
                    Apellidos
                    <input
                      value={profile.lastName}
                      maxLength={160}
                      onChange={changeProfile('lastName')}
                    />
                  </label>
                </div>
                <label>
                  Teléfono
                  <input
                    value={profile.phone}
                    maxLength={30}
                    inputMode="tel"
                    onChange={changeProfile('phone')}
                  />
                </label>
                <div className="profile-cabsa-readonly">
                  <span>Nombre de usuario</span>
                  <strong>{profile.username || 'No disponible'}</strong>
                </div>
                <div className="profile-cabsa-readonly">
                  <span>Correo electrónico</span>
                  <strong>{profile.email || 'No disponible'}</strong>
                </div>
                <button
                  className="profile-cabsa-button"
                  type="submit"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </form>
            </section>

            <section id="cambiar-contrasena" className="profile-cabsa-card">
              <h2>Cambiar contraseña</h2>
              <p>Usa al menos ocho caracteres y confirma la nueva contraseña.</p>
              {passwordError && <div className="profile-cabsa-alert" role="alert">{passwordError}</div>}
              <form className="profile-cabsa-form" onSubmit={submitPassword}>
                <label>
                  Contraseña actual
                  <input
                    value={password.currentPassword}
                    type="password"
                    autoComplete="current-password"
                    required
                    onChange={changePassword('currentPassword')}
                  />
                </label>
                <label>
                  Nueva contraseña
                  <input
                    value={password.password}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    onChange={changePassword('password')}
                  />
                </label>
                <label>
                  Confirmar nueva contraseña
                  <input
                    value={password.passwordConfirmation}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    onChange={changePassword('passwordConfirmation')}
                  />
                </label>
                <button
                  className="profile-cabsa-button profile-cabsa-button--secondary"
                  type="submit"
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Actualizando…' : 'Actualizar contraseña'}
                </button>
              </form>
            </section>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
