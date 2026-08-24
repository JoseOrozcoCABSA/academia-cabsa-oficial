import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, Filter, Mail, MessageSquareText, RefreshCw, Save, Search, UserRoundCheck, X } from 'lucide-react';
import { Badge, Button, EmptyState, Loader } from '@/components/common';
import { supportAdminService } from '@/services/supportAdminService';
import './support-requests-manager.css';
import './support-attachment-preview.css';

const statusMeta = {
  nuevo: ['Nuevo', 'blue'],
  en_revision: ['En revisión', 'purple'],
  en_proceso: ['En proceso', 'gold'],
  respondido: ['Respondido', 'green'],
  cerrado: ['Cerrado', 'neutral'],
};
const priorityMeta = {
  baja: ['Baja', 'neutral'],
  normal: ['Normal', 'blue'],
  alta: ['Alta', 'gold'],
  urgente: ['Urgente', 'red'],
};
const initialFilters = { status: '', priority: '', search: '', page: 1, limit: 30 };
const dateTime = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const bytes = (value) => {
  const size = Number(value || 0);
  return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
};

export default function SupportRequestsManager() {
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await supportAdminService.dashboard(filters)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => [
    ['Todas', 'total', ''],
    ['Nuevas', 'nuevo', 'nuevo'],
    ['En revisión', 'en_revision', 'en_revision'],
    ['En proceso', 'en_proceso', 'en_proceso'],
    ['Respondidas', 'respondido', 'respondido'],
    ['Cerradas', 'cerrado', 'cerrado'],
  ], []);

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters({ ...draft, page: 1 });
  };

  return <div className="support-manager">
    <header className="support-manager-heading">
      <div><p className="eyebrow">Administración de plataforma</p><h1>Gestor de peticiones de soporte</h1><p>Revisa solicitudes, evidencia, responsables, respuestas y notificaciones al usuario.</p></div>
      <Button variant="secondary" onClick={load}><RefreshCw /> Actualizar</Button>
    </header>
    {notice && <div className="alert alert--success" role="status">{notice}</div>}
    {error && <div className="alert alert--error" role="alert">{error}</div>}

    <section className="support-stats" aria-label="Resumen de peticiones">
      {stats.map(([label, key, status]) => <button type="button" className={filters.status === status ? 'active' : ''} key={key} onClick={() => { setDraft((current) => ({ ...current, status })); setFilters((current) => ({ ...current, status, page: 1 })); }}>
        <strong>{Number(data?.counts?.[key] || 0)}</strong><span>{label}</span>
      </button>)}
    </section>

    <form className="support-filters" onSubmit={applyFilters}>
      <label className="support-search"><span>Buscar</span><div><Search /><input value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="Folio, correo, usuario, tema o asunto" /></div></label>
      <label><span>Estado</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">Todos</option>{Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta[0]}</option>)}</select></label>
      <label><span>Prioridad</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option value="">Todas</option>{Object.entries(priorityMeta).map(([value, meta]) => <option value={value} key={value}>{meta[0]}</option>)}</select></label>
      <Button type="submit"><Filter /> Aplicar filtros</Button>
    </form>

    {loading ? <Loader label="Consultando peticiones" /> : data?.tickets?.length ? <section className="support-ticket-list">
      {data.tickets.map((ticket) => <TicketCard ticket={ticket} assignees={data.assignees} key={ticket.id} onEdit={() => setEditing(ticket)} onPreview={setPreviewAttachment} />)}
    </section> : <EmptyState title="No hay peticiones con estos filtros" description="Cambia los filtros o espera una nueva solicitud." />}

    {data?.pagination?.pages > 1 && <nav className="support-pagination" aria-label="Paginación"><Button variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</Button><span>Página {data.pagination.page} de {data.pagination.pages} · {data.pagination.total} peticiones</span><Button variant="secondary" disabled={filters.page >= data.pagination.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</Button></nav>}

    {editing && <TicketEditor ticket={editing} assignees={data.assignees} onClose={() => setEditing(null)} onSaved={async (message) => { setEditing(null); setNotice(message); await load(); }} />}
    {previewAttachment && <AttachmentPreview attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />}
  </div>;
}

function TicketCard({ ticket, onEdit, onPreview }) {
  const status = statusMeta[ticket.estado] || [ticket.estado, 'neutral'];
  const priority = priorityMeta[ticket.prioridad] || [ticket.prioridad, 'neutral'];
  return <article className={`support-ticket support-ticket--${ticket.prioridad}`}>
    <header><div><p>{ticket.folio}</p><h2>{ticket.asunto}</h2></div><div className="support-badges"><Badge tone={status[1]}>{status[0]}</Badge><Badge tone={priority[1]}>{priority[0]}</Badge></div></header>
    <div className="support-ticket-grid">
      <div>
        <dl><div><dt>Solicitante</dt><dd>{ticket.nombre || ticket.usuario_login || 'Sin nombre'}</dd></div><div><dt>Correo</dt><dd>{ticket.correo || 'Sin correo'}</dd></div><div><dt>Tema</dt><dd>{ticket.tema || 'General'}</dd></div><div><dt>Creada</dt><dd>{dateTime(ticket.creado_en)}</dd></div><div><dt>Responsable</dt><dd>{ticket.assigned_name || 'Sin asignar'}</dd></div><div><dt>Actualizada</dt><dd>{dateTime(ticket.actualizado_en)}</dd></div></dl>
        <h3>Descripción</h3><p className="support-description">{ticket.descripcion}</p>
        {!!ticket.attachments?.length && <div className="support-attachments"><strong>Evidencia adjunta</strong>{ticket.attachments.map((attachment) => <div className="support-attachment" key={attachment.id}><button type="button" onClick={() => onPreview(attachment)}><Eye /> <span>{attachment.archivo_nombre || 'Evidencia'}<small>{bytes(attachment.size_bytes)} · Vista previa</small></span></button><button type="button" className="support-attachment-download" onClick={() => void supportAdminService.downloadAttachment(attachment)} title="Descargar archivo" aria-label={`Descargar ${attachment.archivo_nombre || 'evidencia'}`}><Download /></button></div>)}</div>}
      </div>
      <aside>
        {ticket.respuesta_admin ? <><h3>Respuesta actual</h3><p className="support-current-reply">{ticket.respuesta_admin}</p></> : <div className="support-no-reply"><MessageSquareText /><span>Aún no tiene respuesta</span></div>}
        <Button onClick={onEdit}><UserRoundCheck /> Gestionar petición</Button>
      </aside>
    </div>
    {!!ticket.history?.length && <details className="support-history"><summary>Historial de seguimiento ({ticket.history.length})</summary>{ticket.history.map((item) => <div key={item.id}><span>{dateTime(item.creado_en)}</span><strong>{item.actor_name || 'Administrador'}</strong><p>{statusMeta[item.estado_nuevo]?.[0] || item.estado_nuevo} · {priorityMeta[item.prioridad_nueva]?.[0] || item.prioridad_nueva}{item.notificacion_enviada ? ' · Correo enviado' : ''}</p>{item.respuesta && <blockquote>{item.respuesta}</blockquote>}</div>)}</details>}
  </article>;
}

function AttachmentPreview({ attachment, onClose }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    supportAdminService.previewAttachment(attachment).then((result) => {
      objectUrl = result.url;
      if (active) setPreview(result);
      else URL.revokeObjectURL(result.url);
    }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment]);
  return <div className="support-preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="support-preview" role="dialog" aria-modal="true" aria-labelledby="support-preview-title">
      <header><div><p>Evidencia adjunta</p><h2 id="support-preview-title">{attachment.archivo_nombre || 'Imagen adjunta'}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar vista previa"><X /></button></header>
      <div className="support-preview-body">{error ? <div className="alert alert--error">{error}</div> : !preview ? <Loader label="Cargando imagen adjunta" /> : preview.mimeType.startsWith('image/') ? <img src={preview.url} alt={attachment.archivo_nombre || 'Evidencia de la petición'} /> : <iframe src={preview.url} title={attachment.archivo_nombre || 'Adjunto'} />}</div>
      <footer><span>{bytes(attachment.size_bytes)} · {attachment.mime_type || preview?.mimeType || 'Archivo'}</span><div><Button variant="secondary" onClick={onClose}>Cerrar</Button><Button onClick={() => void supportAdminService.downloadAttachment(attachment)}><Download /> Descargar</Button></div></footer>
    </section>
  </div>;
}

function TicketEditor({ ticket, assignees, onClose, onSaved }) {
  const [form, setForm] = useState({ status: ticket.estado, priority: ticket.prioridad, assignedUserId: ticket.asignado_user_id || '', reply: ticket.respuesta_admin || '', notify: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const result = await supportAdminService.update(ticket.id, form);
      await onSaved(result.message);
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  return <div className="support-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="support-editor" role="dialog" aria-modal="true" aria-labelledby="support-editor-title">
      <header><div><p>{ticket.folio}</p><h2 id="support-editor-title">Gestionar petición</h2></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header>
      <form onSubmit={save}>
        <div className="support-editor-grid"><label><span>Estado</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta[0]}</option>)}</select></label><label><span>Prioridad</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(priorityMeta).map(([value, meta]) => <option value={value} key={value}>{meta[0]}</option>)}</select></label></div>
        <label><span>Asignar a usuario</span><select value={form.assignedUserId} onChange={(event) => setForm({ ...form, assignedUserId: event.target.value })}><option value="">Sin asignar</option>{assignees.map((user) => <option value={user.id} key={user.id}>{user.display_name} — {user.email}</option>)}</select></label>
        <label><span>Respuesta para el usuario</span><textarea rows="8" maxLength="10000" value={form.reply} onChange={(event) => setForm({ ...form, reply: event.target.value })} placeholder="Escribe la respuesta o seguimiento para el usuario." /></label>
        <label className="support-notify"><input type="checkbox" checked={form.notify} onChange={(event) => setForm({ ...form, notify: event.target.checked })} /><Mail /><span>Notificar al usuario por correo al guardar</span></label>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <footer><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}><Save /> {saving ? 'Guardando…' : 'Guardar cambios'}</Button></footer>
      </form>
    </section>
  </div>;
}
