/**
 * @file Componente `Register`.
 *
 * Fija el título del documento a «Crear cuenta — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 * Consume: `authService`.
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */


import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePostalCodeLookup } from '@/hooks/usePostalCodeLookup';
import { authService } from '@/services/authService';
import {
  applyFieldChange,
  fieldValueFrom,
  initialRegistrationForm,
} from '@/utils/registrationForm';

/**
 * Alta de cuenta con busqueda de domicilio por codigo postal.
 *
 * La pagina coordina el estado del formulario, el catalogo de regiones y el
 * envio. La limpieza de campos dependientes vive en `utils/registrationForm` y
 * la busqueda diferida del codigo postal en `usePostalCodeLookup`.
 *
 * Al terminar redirige con `replace`, de modo que el boton de retroceso no
 * vuelve al formulario ya enviado.
 */
export default function Register() {
  const [form, setForm] = useState(initialRegistrationForm);
  const [catalog, setCatalog] = useState({ fomaqroRegions: {} });
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  /** Selecciona sola la colonia cuando el codigo postal solo tiene una. */
  const selectSingleColony = useCallback((colony) => {
    setForm((current) => ({ ...current, colonyId: String(colony.id) }));
  }, []);

  const {
    location,
    status: postalStatus,
    loading: postalLoading,
  } = usePostalCodeLookup(
    form.postalCode,
    form.fomaqroMember === 'no',
    selectSingleColony,
  );

  useEffect(() => {
    let active = true;
    authService.registrationCatalog()
      .then((result) => {
        if (active) setCatalog(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Crear cuenta — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const selectedRegion = useMemo(
    () => catalog.fomaqroRegions?.[form.regionId],
    [catalog.fomaqroRegions, form.regionId],
  );

  const selectedColony = useMemo(
    () => location?.colonies.find(
      (colony) => String(colony.id) === String(form.colonyId),
    ) || null,
    [location, form.colonyId],
  );

  /** Genera el manejador de un campo delegando la limpieza a las reglas puras. */
  const change = (field) => (event) => {
    setForm((current) => applyFieldChange(current, field, fieldValueFrom(event)));
  };

  /** El codigo postal se normaliza en las reglas: solo digitos y maximo cinco. */
  const changePostalCode = (event) => {
    setForm((current) => applyFieldChange(current, 'postalCode', event.target.value));
  };


  /**
   * Registra la cuenta y lleva al perfil.
   *
   * El error se muestra en el formulario sin limpiar los campos.
   */
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const session = await register(form);
      navigate(`/verificar-cuenta?email=${encodeURIComponent(session.email || form.email)}`, {
        replace: true,
        state: {
          message: session.emailSent
            ? 'Cuenta creada. Enviamos un código de activación a tu correo.'
            : 'Cuenta creada, pero no pudimos enviar el correo. Solicita un código nuevo.',
        },
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="auth-cabsa-card auth-cabsa-card--wide">
      <span className="auth-cabsa-icon" aria-hidden="true"><UserPlus /></span>
      <p className="eyebrow">Academia CABSA</p>
      <h1>Crear cuenta</h1>
      <p className="auth-cabsa-intro">
        Regístrate para guardar tu avance, participar en los foros y acceder a oportunidades de beca.
      </p>

      {error && <div className="auth-cabsa-errors" role="alert">{error}</div>}

      <form className="auth-cabsa-form" onSubmit={submit}>
        <div className="auth-cabsa-grid">
          <label>
            Nombre completo
            <input
              value={form.fullName}
              maxLength={120}
              autoComplete="name"
              required
              onChange={change('fullName')}
            />
          </label>
          <label>
            Nombre de usuario
            <input
              value={form.username}
              minLength={3}
              maxLength={40}
              pattern="[A-Za-z0-9._-]{3,40}"
              title="Usa entre 3 y 40 letras, números, puntos, guiones o guiones bajos."
              autoComplete="username"
              placeholder="Ej. jose.perez"
              required
              onChange={change('username')}
            />
            <small>De 3 a 40 caracteres: letras, números, punto, guion o guion bajo.</small>
          </label>
          <label>
            Correo electrónico
            <input
              value={form.email}
              type="email"
              maxLength={190}
              autoComplete="email"
              required
              onChange={change('email')}
            />
          </label>
          <label>
            Contraseña
            <input
              value={form.password}
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              onChange={change('password')}
            />
            <small>Mínimo 8 caracteres.</small>
          </label>
          <label>
            Confirmar contraseña
            <input
              value={form.passwordConfirmation}
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              onChange={change('passwordConfirmation')}
            />
          </label>
        </div>

        <fieldset className="auth-cabsa-fieldset">
          <legend>Datos FOMAQRO</legend>
          <span className="auth-cabsa-label">¿Eres parte de FOMAQRO?</span>
          <div className="auth-cabsa-radio-row">
            <label>
              <input
                type="radio"
                name="fomaqroMember"
                value="yes"
                checked={form.fomaqroMember === 'yes'}
                onChange={change('fomaqroMember')}
              />
              Sí
            </label>
            <label>
              <input
                type="radio"
                name="fomaqroMember"
                value="no"
                checked={form.fomaqroMember === 'no'}
                onChange={change('fomaqroMember')}
              />
              No
            </label>
          </div>
        </fieldset>

        {form.fomaqroMember === 'no' && <fieldset className="auth-cabsa-fieldset">
          <legend>Ubicación</legend>
          <div className="auth-cabsa-grid">
            <label>
              Código postal
              <input
                value={form.postalCode}
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                placeholder="Ej. 83200"
                autoComplete="postal-code"
                required
                onChange={changePostalCode}
              />
              <small>Al capturarlo se validará tu ubicación.</small>
              <button
                className="auth-cabsa-secondary-button"
                type="button"
                disabled={form.postalCode.length !== 5 || postalLoading}
                onClick={() => setPostalRequest((current) => current + 1)}
              >
                {postalLoading ? 'Buscando…' : 'Buscar código postal'}
              </button>
            </label>
            <label>
              Colonia
              <select
                value={form.colonyId}
                required
                disabled={!location || postalLoading}
                onChange={change('colonyId')}
              >
                <option value="">
                  {location ? 'Selecciona tu colonia' : 'Primero captura tu código postal'}
                </option>
                {location?.colonies.map((colony) => (
                  <option value={colony.id} key={colony.id}>{colony.name}</option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <input
                value={location?.state?.name || ''}
                placeholder="Se completa automáticamente"
                readOnly
              />
            </label>
            <label>
              Municipio
              <input
                value={location?.municipality?.name || ''}
                placeholder="Se completa automáticamente"
                readOnly
              />
            </label>
            <label>
              Ciudad
              <input
                value={selectedColony?.city || location?.city?.name || ''}
                placeholder="Se completa automáticamente"
                readOnly
              />
            </label>
            <label>
              Tipo de asentamiento
              <input
                value={selectedColony?.settlementType || ''}
                placeholder="Se completa al seleccionar colonia"
                readOnly
              />
            </label>
            <label>
              Zona
              <input
                value={selectedColony?.zone || ''}
                placeholder="Se completa al seleccionar colonia"
                readOnly
              />
            </label>
          </div>
          <p
            className={`auth-cabsa-note${location ? ' auth-cabsa-note--success' : ''}`}
            aria-live="polite"
          >
            {postalStatus}
          </p>
        </fieldset>}

        {form.fomaqroMember === 'yes' && (
          <fieldset className="auth-cabsa-fieldset">
            <legend>Información FOMAQRO</legend>
            <div className="auth-cabsa-grid">
              <label>
                RFC
                <input
                  value={form.rfc}
                  maxLength={13}
                  placeholder="ABCD800101XXX"
                  autoComplete="off"
                  required
                  onChange={change('rfc')}
                />
              </label>
              <label>
                Región FOMAQRO
                <select
                  value={form.regionId}
                  required
                  onChange={change('regionId')}
                >
                  <option value="">Selecciona una región</option>
                  {Object.entries(catalog.fomaqroRegions || {}).map(([id, region]) => (
                    <option value={id} key={id}>{region.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Municipio FOMAQRO
                <select
                  value={form.fomaqroMunicipalityId}
                  required
                  disabled={!selectedRegion}
                  onChange={change('fomaqroMunicipalityId')}
                >
                  <option value="">Selecciona un municipio</option>
                  {Object.entries(selectedRegion?.municipalities || {}).map(([id, name]) => (
                    <option value={id} key={`${id}-${name}`}>{name}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
        )}

        <label className="auth-cabsa-check auth-cabsa-legal-check">
          <input
            type="checkbox"
            checked={form.terms}
            required
            onChange={change('terms')}
          />
          <span>
            Acepto los <Link to="/terminos" target="_blank" rel="noopener noreferrer">términos y condiciones</Link>
            {' '}y he leído el <Link to="/aviso-privacidad" target="_blank" rel="noopener noreferrer">aviso de privacidad</Link>.
          </span>
        </label>

        <button
          className="auth-cabsa-button"
          disabled={loading
            || !form.fomaqroMember
            || (form.fomaqroMember === 'no' && (postalLoading || !location || !form.colonyId))}
          type="submit"
        >
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="auth-cabsa-footer">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </section>
  );
}
