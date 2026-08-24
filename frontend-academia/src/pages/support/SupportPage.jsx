/**
 * @file Componente `SupportPage`.
 *
 * Consume: `supportService`.
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImagePlus, LoaderCircle, Mail, Send, TicketCheck } from 'lucide-react';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supportService } from '@/services/supportService';
import '@/support.css';

const topics = [
  'Acceso y cuenta',
  'Cursos y lecciones',
  'Cápsulas y gamificación',
  'Otro',
];

const initialForm = {
  topic: '',
  subject: '',
  message: '',
  files: [],
};

const statusLabels = {
  nuevo: 'Nueva',
  open: 'Nueva',
  abierto: 'Nueva',
  en_proceso: 'En proceso',
  in_progress: 'En proceso',
  cerrado: 'Cerrada',
  closed: 'Cerrada',
};

/**
 * Traduce el estado del ticket a un sufijo de clase CSS.
 *
 * Acepta los valores en espanol y en ingles porque los tickets heredados
 * guardan el estado en ambos idiomas. Cualquier valor no reconocido cae en
 * `open`, de modo que un estado nuevo se ve como abierto en lugar de quedarse
 * sin estilo.
 */
const statusClass = (status) => {
  const value = String(status || '').toLowerCase();
  if (['cerrado', 'closed'].includes(value)) return 'closed';
  if (['en_proceso', 'in_progress'].includes(value)) return 'in-progress';
  return 'open';
};

/**
 * Formatea una fecha para lectura, en horario local del navegador.
 *
 * Devuelve cadena vacia si no hay valor. No valida la fecha: un valor
 * inservible produce `Invalid Date` en pantalla en vez de un hueco.
 */
const formatDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

/**
 * Formulario de soporte y listado de los tickets del usuario.
 *
 * Permite hasta tres imagenes de 5 MB como evidencia. Los mismos limites deben
 * estar aplicados en el servicio de notificaciones: aqui son de conveniencia.
 */
export default function SupportPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ total: 0, open: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Nombre a mostrar, con tres alternativas en orden: nombre para mostrar,
   * nombre y apellido concatenados, y usuario. Acaba en cadena vacia si el
   * perfil no tiene ninguno.
   *
   * Este valor se envia como `name` al crear el ticket, asi que un perfil
   * incompleto genera un ticket sin nombre.
   */
  const displayName = useMemo(() => (
    user?.display_name
    || [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || user?.username
    || ''
  ), [user]);

  /**
   * Recarga los tickets del usuario y sus totales.
   *
   * Los `??` cubren una respuesta incompleta del servicio: la pantalla se queda
   * vacia en lugar de romper. El `finally` libera el indicador de carga aunque
   * falle.
   */
  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await supportService.list();
      setTickets(result?.tickets ?? []);
      setCounts(result?.counts ?? { total: 0, open: 0, closed: 0 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  /** Actualiza un campo del formulario por el `name` del control. */
  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  /**
   * Valida los adjuntos antes de aceptarlos: hasta 3 archivos y 5 MB cada uno.
   *
   * Al rechazar, limpia el propio `<input type="file">`, porque si no el
   * navegador seguiria mostrando los archivos elegidos aunque no se hayan
   * guardado en el formulario.
   *
   * Es validacion de conveniencia, no de seguridad: los mismos limites deben
   * estar aplicados en el servicio de notificaciones.
   */
  const selectFiles = (event) => {
    const files = [...event.target.files];
    setError('');
    if (files.length > 3) {
      setError('Solo puedes adjuntar hasta 3 imágenes.');
      event.target.value = '';
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setError('Cada imagen debe pesar máximo 5 MB.');
      event.target.value = '';
      return;
    }
    setForm((current) => ({ ...current, files }));
  };

  /**
   * Envia el ticket con sus adjuntos.
   *
   * Tras el alta reinicia el formulario y cambia `fileInputKey`, lo que fuerza a
   * React a montar un `<input type="file">` nuevo: es la unica forma de vaciar
   * ese control, cuyo valor no puede fijarse por codigo.
   *
   * Recarga la lista al terminar para que el ticket recien creado aparezca.
   */
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const result = await supportService.create({
        ...form,
        name: displayName,
      });
      setSuccess(result?.message ?? 'Tu solicitud fue enviada correctamente.');
      setForm(initialForm);
      setFileInputKey((value) => value + 1);
      await loadTickets();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Descarga un adjunto.
   *
   * La comprobacion de que el adjunto sea del usuario esta en el servidor; aqui
   * un fallo solo se muestra como aviso.
   */
  const downloadAttachment = async (attachment) => {
    setError('');
    try {
      await supportService.downloadAttachment(attachment);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="support-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        <section className="support-page">
          <div className="support-heading">
        <span className="eyebrow">Mesa de ayuda</span>
        <h1>Soporte técnico</h1>
        <p>
          Envía una solicitud y consulta aquí su seguimiento. El equipo de Academia CABSA
          te responderá desde la plataforma.
        </p>
          </div>

          {success && <div className="support-alert support-alert--success">{success}</div>}
          {error && (
            <div className="support-alert support-alert--error">
              <span>{error}</span>
              {loading === false && tickets.length === 0 && (
                <button type="button" onClick={loadTickets}>Reintentar</button>
              )}
            </div>
          )}

          <div className="support-stats" aria-label="Resumen de solicitudes">
            <div><strong>{counts.total}</strong><span>Solicitudes totales</span></div>
            <div><strong>{counts.open}</strong><span>En seguimiento</span></div>
            <div><strong>{counts.closed}</strong><span>Cerradas</span></div>
          </div>

          <div className="support-layout">
            <article className="support-panel support-form-card">
          <h2>Crear una solicitud</h2>
          <p>Describe el problema con claridad. Puedes adjuntar hasta 3 imágenes de 5 MB cada una.</p>

          <form onSubmit={submit}>
            <label>
              <span>Tema</span>
              <select name="topic" value={form.topic} onChange={updateField} required>
                <option value="">Selecciona un tema</option>
                {topics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}
              </select>
            </label>

            <label>
              <span>Asunto</span>
              <input
                name="subject"
                value={form.subject}
                onChange={updateField}
                required
                maxLength="255"
              />
            </label>

            <label>
              <span>Descripción</span>
              <textarea
                name="message"
                value={form.message}
                onChange={updateField}
                rows="7"
                required
                minLength="10"
                maxLength="5000"
              />
            </label>

            <label className="support-upload">
              <span>Imágenes adjuntas</span>
              <div>
                <ImagePlus aria-hidden="true" />
                <strong>Seleccionar evidencias</strong>
                <small>JPG, PNG, WEBP o GIF · máximo 3 archivos de 5 MB</small>
              </div>
              <input
                key={fileInputKey}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={selectFiles}
              />
            </label>

            {form.files.length > 0 && (
              <ul className="support-selected-files">
                {form.files.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                ))}
              </ul>
            )}

            <aside className="support-email-option">
              <Mail aria-hidden="true" />
              <div>
                <strong>Si tu petición incluye videos, favor de enviarlos por correo.</strong>
                <p>
                  Envíalo desde tu correo electrónico a{' '}
                  <a href="mailto:soporte@academiacabsa.com?subject=Soporte%20Academia%20CABSA%20-%20Evidencia%20en%20video&body=Hola%2C%20adjunto%20la%20evidencia%20de%20mi%20solicitud%20de%20soporte.%0A%0ANombre%3A%0ACorreo%20de%20mi%20cuenta%3A%0AFolio%20del%20ticket%20(si%20existe)%3A%0ADescripci%C3%B3n%20del%20problema%3A">
                    soporte@academiacabsa.com
                  </a>
                  . Si ya creaste una solicitud, incluye su folio para relacionar la evidencia.
                </p>
              </div>
            </aside>

            <button className="button button--primary support-submit" type="submit" disabled={submitting}>
              {submitting
                ? <><LoaderCircle className="spin" /> Enviando…</>
                : <><Send /> Enviar solicitud</>}
            </button>
          </form>
            </article>

            <article className="support-panel ticket-history">
          <h2>Mis solicitudes</h2>

          {loading ? (
            <div className="support-loading"><LoaderCircle className="spin" /><span>Cargando solicitudes…</span></div>
          ) : tickets.length === 0 ? (
            <div className="support-empty">
              <TicketCheck aria-hidden="true" />
              <p>Aún no tienes solicitudes. Si necesitas ayuda, puedes crear la primera desde este formulario.</p>
            </div>
          ) : tickets.map((ticket) => (
            <div className="ticket-card" key={ticket.id}>
              <div className="ticket-top">
                <strong>{ticket.folio || `CABSA-SOP-${ticket.id}`}</strong>
                <span className={`support-status support-status--${statusClass(ticket.estado)}`}>
                  {statusLabels[String(ticket.estado || '').toLowerCase()] || 'Nueva'}
                </span>
              </div>
              <h3>{ticket.asunto}</h3>
              <small>{ticket.tema} · {formatDate(ticket.creado_en)}</small>
              <p>{ticket.descripcion}</p>

              {ticket.respuesta_admin && (
                <div className="ticket-response">
                  <strong>Respuesta de soporte</strong>
                  <p>{ticket.respuesta_admin}</p>
                </div>
              )}

              {ticket.attachments?.length > 0 && (
                <div className="ticket-attachments">
                  {ticket.attachments.map((attachment) => (
                    <button
                      type="button"
                      key={attachment.id}
                      onClick={() => downloadAttachment(attachment)}
                    >
                      {attachment.archivo_nombre || 'Ver evidencia'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
