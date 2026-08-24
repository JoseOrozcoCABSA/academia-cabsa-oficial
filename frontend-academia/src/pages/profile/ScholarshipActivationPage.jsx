import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { profileService } from '@/services/profileService';
import { sanitizeContentHtml } from '@/utils/sanitizeContentHtml';
import '@/profile-cabsa.css';

const SCHOLARSHIP_MESSAGES = {
  6: {
    eyebrow: 'Beca Docente',
    title: 'Bienvenido/a a tu Beca Docente CABSA',
    description: (
      <>¡Gracias por unirte a <strong>Academia CABSA</strong>! Con tu <strong>Beca Docente</strong> accedes a cápsulas educativas, tutores y asistentes virtuales, microcursos, foros temáticos y grupos donde podrás compartir y aprender con otros docentes.</>
    ),
    benefits: [
      'Cápsulas educativas breves y accionables.',
      'Microcursos para avanzar a tu ritmo.',
      'Tutores y asistentes virtuales para apoyar tu planeación y resolver dudas frecuentes.',
      'Foros temáticos y grupos para el intercambio entre docentes.',
      'Un grupo propio con capacidad para crear y acompañar hasta 30 alumnos.',
      'Reconocimientos por progreso cuando apliquen.',
    ],
    sofiaText: 'Si cuentas con Matrícula Sofia XT, actívala desde aquí',
  },
  8: {
    eyebrow: 'Beca Familia-Estudiante CABSA',
    title: 'Bienvenido/a a tu Beca Familia-Estudiante CABSA',
    description: (
      <>¡Qué bueno tenerte en <strong>Academia CABSA</strong>! Con tu <strong>Beca Familia-Estudiante CABSA</strong> tienes acceso a cápsulas educativas, tutores y asistentes virtuales, microcursos, foros temáticos y grupos para resolver dudas y compartir avances.</>
    ),
    benefits: [
      'Cápsulas breves para entender lo esencial.',
      'Microcursos con actividades sencillas.',
      'Tutores y asistentes virtuales con explicaciones guiadas.',
      'Foros temáticos y grupos de estudiantes.',
      'Reconocimientos por progreso cuando apliquen.',
    ],
    sofiaText: 'Si cuentas con Matrícula Sofia XT, accede desde aquí',
  },
  11: {
    eyebrow: 'Beca Personal',
    title: 'Bienvenido/a a tu Beca Personal CABSA',
    description: (
      <>¡Gracias por unirte a <strong>Academia CABSA</strong>! Con tu <strong>Beca Personal</strong> accedes a cápsulas educativas, tutores y asistentes virtuales, microcursos, foros temáticos y grupos. Continuamente ampliamos el catálogo para ofrecerte recursos prácticos.</>
    ),
    benefits: [
      'Cápsulas educativas breves y accionables.',
      'Microcursos para avanzar a tu ritmo.',
      'Tutores y asistentes virtuales para apoyo personalizado.',
      'Foros temáticos y grupos de aprendizaje.',
      'Reconocimientos por progreso cuando apliquen.',
    ],
  },
};

const genericMessage = (name) => ({
  eyebrow: 'Beca activa',
  title: `Bienvenido/a a ${name || 'tu beca CABSA'}`,
  description: <>Tu beca está activa. Ya puedes aprovechar los recursos educativos disponibles en Academia CABSA.</>,
  benefits: [
    'Cápsulas y materiales educativos.',
    'Cursos para avanzar a tu ritmo.',
    'Herramientas de inteligencia artificial.',
    'Foros y comunidad Academia CABSA.',
  ],
});

export default function ScholarshipActivationPage() {
  const [profile, setProfile] = useState(null);
  const [groupAccess, setGroupAccess] = useState({ canManage: false, groups: [] });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmCancellation, setConfirmCancellation] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [profileResult, groupResult] = await Promise.all([
        profileService.get(),
        profileService.getManagedGroup().catch(() => ({ canManage: false, groups: [] })),
      ]);
      setProfile(profileResult);
      setGroupAccess(groupResult);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Activar beca — Academia CABSA';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const membershipActive = profile?.membership?.status === 'ACTIVE';
  const membershipSuspended = profile?.membership?.status === 'SUSPENDED';
  const customPresentationHtml = useMemo(() => {
    const primaryGroup = groupAccess.groups?.[0];
    const seats = groupAccess.canManage && primaryGroup
      ? `${primaryGroup.availableSeats} de ${primaryGroup.seatLimit} lugares disponibles`
      : 'Administrar grupo';
    return sanitizeContentHtml(
      String(profile?.membership?.presentation?.html || '').replaceAll('{{DEPENDENT_SEATS}}', seats),
    );
  }, [groupAccess, profile?.membership?.presentation?.html]);
  const customPresentationHasActions = customPresentationHtml.includes('scholarship-next-actions');
  const message = useMemo(() => {
    if (!membershipActive) return null;
    const sectionLabels = {
      courses: 'Cursos y microcursos para avanzar a tu ritmo.',
      lessons: 'Lecciones y actividades educativas.',
      media: 'Cápsulas y materiales de la mediateca.',
      assistants: 'Asistentes virtuales de apoyo.',
      tutors: 'Tutores virtuales con explicaciones guiadas.',
      forums: 'Foros y comunidad Academia CABSA.',
      progress: 'Seguimiento de avance y reconocimientos.',
      support: 'Soporte y acompañamiento de la plataforma.',
    };
    const benefits = Object.entries(profile.access?.sections || {})
      .filter(([, allowed]) => allowed)
      .map(([section]) => sectionLabels[section])
      .filter(Boolean);
    const primaryGroup = groupAccess.groups?.[0];
    if (groupAccess.canManage && primaryGroup) {
      benefits.push(`Administración de dependientes con ${primaryGroup.seatLimit} lugares por titular.`);
    }
    const presentation = profile.membership.presentation || {};
    return {
      eyebrow: presentation.eyebrow || profile.membership.name || 'Beca activa',
      title: presentation.title || `Bienvenido/a a ${profile.membership.name || 'tu beca CABSA'}`,
      description: presentation.introduction || profile.membership.description || 'Tu beca está activa. Ya puedes aprovechar los recursos educativos habilitados para este perfil.',
      benefits: presentation.benefits?.length ? presentation.benefits : benefits.length ? benefits : ['Acceso a los recursos habilitados para tu tipo de beca.'],
      presentation,
    };
  }, [groupAccess, membershipActive, profile]);

  const activate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await profileService.activateScholarship(code);
      setCode('');
      setNotice('Tu beca fue activada correctamente.');
      await loadProfile();
      window.dispatchEvent(new CustomEvent('cabsa:membership-changed', { detail: { active: true } }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelScholarship = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await profileService.cancelScholarship();
      setConfirmCancellation(false);
      setNotice('Tu beca fue cancelada correctamente.');
      await loadProfile();
      window.dispatchEvent(new CustomEvent('cabsa:membership-changed', { detail: { active: false } }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-cabsa-public">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />
      <main id="contenido">
        {loading ? (
          <div className="profile-cabsa-state"><Loader label="Consultando tu beca" /></div>
        ) : (
          <section className="profile-cabsa-page scholarship-page">
            {notice && <div className="profile-cabsa-message" role="status">{notice}</div>}
            {error && <div className="profile-cabsa-alert" role="alert">{error}</div>}

            {membershipSuspended ? (
              <>
                <header className="profile-cabsa-hero scholarship-activation-hero">
                  <p className="eyebrow">Acceso temporalmente desactivado</p>
                  <h1>Tu beca está suspendida</h1>
                  <p>Tu cuenta, vigencia, cursos y avances continúan guardados. La administración puede reactivar la beca sin perder información.</p>
                </header>
                <section className="profile-cabsa-card profile-scholarship-card scholarship-activation-card">
                  <h2>{profile?.membership?.name || 'Beca Academia CABSA'}</h2>
                  <p>No necesitas introducir nuevamente el código. Comunícate con la administración para solicitar la reactivación.</p>
                  <Link className="profile-cabsa-button" to="/perfil">Volver a mi perfil</Link>
                </section>
              </>
            ) : !membershipActive ? (
              <>
                <header className="profile-cabsa-hero scholarship-activation-hero">
                  <p className="eyebrow">Activación de beneficios</p>
                  <h1>Activar beca CABSA</h1>
                  <p>Utiliza el código enviado a tu correo para activar los recursos que corresponden a tu tipo de beca.</p>
                </header>
                <section className="profile-cabsa-card profile-scholarship-card scholarship-activation-card">
                  <p className="eyebrow">Código personal</p>
                  <h2>Introduce tu código de beca</h2>
                  <p>El código debe estar asignado al mismo correo de tu cuenta, encontrarse vigente y no haber sido utilizado.</p>
                  <form className="profile-inline-form" onSubmit={activate}>
                    <label>
                      Código de beca
                      <input
                        value={code}
                        onChange={(event) => setCode(
                          event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 80),
                        )}
                        placeholder="Ej. PC-BC-1234567"
                        autoComplete="off"
                        spellCheck="false"
                        required
                      />
                    </label>
                    <button className="profile-cabsa-button" disabled={saving}>
                      {saving ? 'Activando…' : 'Activar beca'}
                    </button>
                  </form>
                </section>
              </>
            ) : (
              <>
                {customPresentationHtml ? (
                  <div className="scholarship-custom-html" dangerouslySetInnerHTML={{ __html: customPresentationHtml }} />
                ) : <><header className="profile-cabsa-hero scholarship-welcome-hero">
                  <p className="eyebrow">{message.eyebrow}</p>
                  <h1>{message.title}</h1>
                  <p>{message.description}</p>
                </header>
                <section className="profile-cabsa-card scholarship-benefits">
                  <p className="eyebrow">Beneficios activos</p>
                  <h2>¿Qué incluye tu beca?</h2>
                  <ul>
                    {message.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
                  </ul>
                  {message.sofiaText && (
                    <a className="scholarship-sofia-link" href="https://www.sofiaxt.com/" target="_blank" rel="noopener noreferrer">
                      {message.sofiaText} →
                    </a>
                    )}
                </section>
                </>}
                {!customPresentationHasActions && <section className="scholarship-next-actions" aria-label="Accesos de la beca">
                  <Link to="/mediateca"><strong>{message.presentation.mediaTitle || 'Explorar cápsulas'}</strong><span>{message.presentation.mediaText || 'Contenido breve y práctico'} →</span></Link>
                  <Link to="/cursos"><strong>{message.presentation.coursesTitle || 'Ver microcursos'}</strong><span>{message.presentation.coursesText || 'Aprende a tu ritmo'} →</span></Link>
                  <Link to="/foros"><strong>{message.presentation.forumsTitle || 'Entrar a los foros'}</strong><span>{message.presentation.forumsText || 'Comparte con la comunidad'} →</span></Link>
                  {groupAccess.canManage && (
                    <Link to="/mis-alumnos"><strong>{message.presentation.dependentsTitle || 'Gestionar dependientes'}</strong><span>{groupAccess.groups?.[0] ? `${groupAccess.groups[0].availableSeats} de ${groupAccess.groups[0].seatLimit} lugares disponibles` : 'Administrar grupo'} →</span></Link>
                  )}
                </section>}
                {profile?.features?.scholarshipSelfCancellation && (
                  <section className="profile-cabsa-card scholarship-cancel-card">
                    <div>
                      <p className="eyebrow">Administrar beneficio</p>
                      <h2>Cancelar mi beca</h2>
                      <p>Al cancelar perderás los beneficios activos. El código utilizado permanecerá en el historial y no podrá usarse de nuevo.</p>
                    </div>
                    {!confirmCancellation ? (
                      <button type="button" className="scholarship-cancel-button" onClick={() => setConfirmCancellation(true)}>Cancelar mi beca</button>
                    ) : (
                      <div className="scholarship-cancel-confirm" role="alert">
                        <strong>¿Confirmas que deseas cancelar tu beca?</strong>
                        <span>Esta acción cerrará tu membresía actual.</span>
                        <div><button type="button" onClick={() => setConfirmCancellation(false)} disabled={saving}>Conservar mi beca</button><button type="button" className="danger" onClick={cancelScholarship} disabled={saving}>{saving ? 'Cancelando…' : 'Sí, cancelar beca'}</button></div>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
