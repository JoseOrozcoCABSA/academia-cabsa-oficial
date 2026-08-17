import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CalendarClock, CheckCircle2, Download, FileCheck2, KeyRound,
  Mail, Pencil, RefreshCw, Search, ShieldX, Sparkles, Trash2, Upload, Users,
} from 'lucide-react';
import { Badge, Button, EmptyState, Input, Loader, Modal } from '@/components/common';
import { scholarshipCodesService } from '@/services/scholarshipCodesService';
import {
  Notice, OverviewCards, date, dateTime, downloadCsv, initialCreate, initialFilters,
  formatNumber, initialImport, modes, normalizePrefix, randomToken, statusLabel, statusTone, validEmail,
} from './scholarshipCodesUi';
import './scholarship-codes-manager.css';
import './scholarship-codes-create.css';
import ScholarshipProfilesPanel from './ScholarshipProfilesPanel';


export default function ScholarshipCodesManager() {
  const [tab, setTab] = useState('create');
  const [overview, setOverview] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [list, setList] = useState({ rows: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(null);
  const [importForm, setImportForm] = useState(initialImport);
  const [validation, setValidation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selfCancellation, setSelfCancellation] = useState(null);
  const [policySaving, setPolicySaving] = useState(false);

  const loadOverview = useCallback(() => scholarshipCodesService.overview().then(setOverview), []);
  const loadPolicy = useCallback(() => scholarshipCodesService.selfCancellationSetting()
    .then((result) => setSelfCancellation(Boolean(result.enabled))), []);
  const loadCodes = useCallback(() => {
    setLoading(true);
    return scholarshipCodesService.list(filters).then(setList)
      .catch((error) => setNotice({ error: true, text: error.message }))
      .finally(() => setLoading(false));
  }, [filters]);
  useEffect(() => {
    Promise.all([loadOverview(), loadPolicy()])
      .catch((error) => setNotice({ error: true, text: error.message }));
  }, [loadOverview, loadPolicy]);
  useEffect(() => { if (tab === 'codes') loadCodes(); }, [loadCodes, tab]);

  const levels = overview?.levels || [];
  const batches = overview?.batches || [];
  const pages = Math.max(1, Math.ceil(Number(list.pagination?.total || 0) / Number(filters.limit)));

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters({ ...draftFilters, page: 1 });
  };
  const [editValues, setEditValues] = useState(null);
  const openEdit = (row) => {
    setEditing(row);
    setEditValues({
      code: row.code || '', email: row.allowed_email || '',
      levelId: String(row.nivel_membresia_id || ''), starts: row.vigente_desde?.slice(0, 10) || '',
      expires: row.vigente_hasta?.slice(0, 10) || '', maxUses: row.max_usos || 1,
      batch: row.lote || '', notes: row.notas || '', state: row.estado || 'ACTIVE',
    });
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await scholarshipCodesService.update(editing.id, editValues);
      setEditing(null);
      setNotice({ text: 'Código actualizado correctamente.' });
      await Promise.all([loadCodes(), loadOverview()]);
    } catch (error) {
      setNotice({ error: true, text: error.message });
    } finally { setSaving(false); }
  };
  const removeCode = async (row) => {
    if (!window.confirm(`¿Eliminar definitivamente el código ${row.code}? Los códigos usados deben revocarse.`)) return;
    try {
      await scholarshipCodesService.remove(row.id);
      setNotice({ text: `Código ${row.code} eliminado.` });
      await Promise.all([loadCodes(), loadOverview()]);
    } catch (error) { setNotice({ error: true, text: error.message }); }
  };
  const toggleCodeActivation = async (row) => {
    if (!row.activation_id) return;
    const suspend = !row.suspended_at;
    if (!window.confirm(`¿${suspend ? 'Desactivar temporalmente' : 'Reactivar'} la beca utilizada por ${row.used_by_name || row.used_by_email}? La cuenta y el historial no se eliminarán.`)) return;
    try {
      await scholarshipCodesService.setActivationSuspended(row.activation_id, suspend);
      setNotice({ text: suspend ? 'Beca desactivada temporalmente.' : 'Beca reactivada correctamente.' });
      await loadCodes();
    } catch (error) { setNotice({ error: true, text: error.message }); }
  };
  const validateImport = async () => {
    setSaving(true);
    try {
      setValidation(await scholarshipCodesService.validate({
        text: importForm.text, defaultEmail: importForm.defaultEmail,
      }));
      setNotice(null);
    } catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setSaving(false); }
  };
  const saveImport = async () => {
    setSaving(true);
    try {
      const result = await scholarshipCodesService.import(importForm);
      setNotice({ text: `Proceso terminado: ${result.inserted} códigos nuevos y ${result.updated} actualizados.` });
      setValidation(null);
      setImportForm(initialImport);
      await loadOverview();
    } catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setSaving(false); }
  };
  const exportRows = async () => {
    try {
      const result = await scholarshipCodesService.list({ ...filters, page: 1, limit: 500 });
      downloadCsv('codigos-beca-cabsa.csv', result.rows.map((row) => ({
        codigo: row.code, correo: row.allowed_email, beca: row.membership_name,
        estado: statusLabel[row.computed_status], vigente_desde: row.vigente_desde,
        vigente_hasta: row.vigente_hasta, usos: row.usos_historicos,
        max_usos: row.max_usos, lote: row.lote,
      })));
    } catch (error) { setNotice({ error: true, text: error.message }); }
  };

  const toggleSelfCancellation = async () => {
    const enabled = !selfCancellation;
    const action = enabled ? 'permitir' : 'bloquear';
    if (!window.confirm(`¿Deseas ${action} la cancelación de beca para todos los beneficiarios?`)) return;
    setPolicySaving(true);
    try {
      const result = await scholarshipCodesService.updateSelfCancellationSetting(enabled);
      setSelfCancellation(Boolean(result.enabled));
      setNotice({
        text: enabled
          ? 'La autocancelación está habilitada para todos los beneficiarios.'
          : 'La autocancelación quedó oculta y bloqueada para todos los beneficiarios.',
      });
    } catch (error) {
      setNotice({ error: true, text: error.message });
    } finally {
      setPolicySaving(false);
    }
  };

  return <div className="page admin-page scholarship-manager">
    <div className="page-heading">
      <div><p className="eyebrow">Administración de plataforma</p><h1>Códigos de membresía</h1><p>Crea códigos asignados por correo y consulta claramente cuáles están disponibles, utilizados o vencidos.</p></div>
      <div className="code-primary-actions"><Button onClick={() => setTab('create')}><Sparkles /> Crear códigos</Button><Button variant="secondary" onClick={() => Promise.all([loadOverview(), tab === 'codes' && loadCodes()])}><RefreshCw /> Actualizar</Button></div>
    </div>
    <OverviewCards stats={overview?.stats} />
    <section className={`card scholarship-policy-card ${selfCancellation ? 'is-enabled' : 'is-blocked'}`}>
      <div className="scholarship-policy-icon">{selfCancellation ? <AlertTriangle /> : <ShieldX />}</div>
      <div>
        <p className="eyebrow">Configuración global</p>
        <h2>Cancelación de beca por el beneficiario</h2>
        <p>{selfCancellation
          ? 'Permitida: todos los usuarios con beca activa verán el botón “Cancelar mi beca”.'
          : 'Bloqueada: el botón no aparece y el servidor rechaza cualquier intento de autocancelación.'}</p>
      </div>
      <Button
        variant={selfCancellation ? 'danger' : 'secondary'}
        onClick={toggleSelfCancellation}
        disabled={policySaving || selfCancellation === null}
      >
        {policySaving ? 'Guardando…' : selfCancellation ? 'Bloquear y ocultar' : 'Permitir autocancelación'}
      </Button>
    </section>
    <nav className="code-tabs">
      {[['create', 'Crear códigos'], ['codes', 'Consultar códigos'], ['profiles', 'Perfiles y dependientes'], ['groups', 'Grupos y vencimientos'], ['import', 'Carga avanzada'], ['cleanup', 'Limpieza por patrón']]
        .map(([value, label]) => <button type="button" className={tab === value ? 'active' : ''} onClick={() => { setTab(value); setNotice(null); }} key={value}>{label}</button>)}
    </nav>
    <Notice notice={notice} />

    {tab === 'create' && <CreateCodesPanel levels={levels} setNotice={setNotice} onCreated={async (batch) => {
      const nextFilters = { ...initialFilters, batch };
      setDraftFilters(nextFilters);
      setFilters(nextFilters);
      setTab('codes');
      await loadOverview();
    }} />}

    {tab === 'codes' && <section>
      <form className="code-filters card" onSubmit={applyFilters}>
        <label><span>Código</span><input value={draftFilters.search} onChange={(event) => setDraftFilters({ ...draftFilters, search: event.target.value })} placeholder="Buscar código" /></label>
        <label><span>Correo</span><input value={draftFilters.email} onChange={(event) => setDraftFilters({ ...draftFilters, email: event.target.value })} placeholder="Buscar correo" /></label>
        <label><span>Tipo de beca</span><select value={draftFilters.level} onChange={(event) => setDraftFilters({ ...draftFilters, level: event.target.value })}><option value="">Todas</option>{levels.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select></label>
        <label><span>Estado operativo</span><select value={draftFilters.status} onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })}><option value="">Todos</option><option value="AVAILABLE">Disponibles</option><option value="USED">Utilizados</option><option value="EXPIRED">Vencidos</option><option value="REVOKED">Revocados</option></select></label>
        <label><span>Lote</span><select value={draftFilters.batch} onChange={(event) => setDraftFilters({ ...draftFilters, batch: event.target.value })}><option value="">Todos</option>{batches.map((batch) => <option value={batch.lote} key={batch.lote}>{batch.lote} ({batch.total})</option>)}</select></label>
        <div><Button type="submit"><Search /> Aplicar</Button><Button variant="secondary" onClick={() => { setDraftFilters(initialFilters); setFilters(initialFilters); }}>Limpiar</Button><Button variant="secondary" onClick={exportRows}><Download /> CSV</Button></div>
      </form>
      {loading ? <section className="card"><Loader label="Consultando códigos" /></section> : list.rows.length
        ? <div className="card code-table"><table><thead><tr><th>Código y lote</th><th>Correo asignado</th><th>Beca</th><th>Vigencia</th><th>Uso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          {list.rows.map((row) => <tr key={row.id}>
            <td><strong className="code-mono">{row.code}</strong><small>{row.lote || 'Sin lote'}</small></td>
            <td><strong>{row.allowed_email}</strong>{row.used_by_name && <small>Usado por {row.used_by_name}</small>}</td>
            <td><strong>{row.membership_name || `Nivel ${row.nivel_membresia_id || 'sin asignar'}`}</strong><small>Máximo {row.max_usos} uso(s)</small></td>
            <td><span>{date(row.vigente_desde)}</span><small>hasta {date(row.vigente_hasta)}</small></td>
            <td><strong>{row.usos_historicos} / {row.max_usos}</strong><small>{row.usado_en ? dateTime(row.usado_en) : 'Sin activación'}</small></td>
            <td><Badge tone={row.suspended_at ? 'gold' : statusTone[row.computed_status] || 'neutral'}>{row.suspended_at ? 'Beca temporalmente desactivada' : statusLabel[row.computed_status] || row.computed_status}</Badge></td>
            <td><div className="code-row-actions"><button type="button" onClick={() => openEdit(row)} title="Editar"><Pencil /></button>{row.activation_id && <button type="button" className={row.suspended_at ? '' : 'danger'} onClick={() => toggleCodeActivation(row)} title={row.suspended_at ? 'Reactivar beca' : 'Desactivar beca temporalmente'}>{row.suspended_at ? <RefreshCw /> : <ShieldX />}</button>}<button type="button" className="danger" onClick={() => removeCode(row)} title="Eliminar código"><Trash2 /></button></div></td>
          </tr>)}
        </tbody></table></div>
        : <section className="card"><EmptyState title="No hay códigos con estos filtros" description="Cambia la búsqueda o abre “Crear códigos” para agregar nuevos." /></section>}
      <div className="code-pagination"><Button variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</Button><span>Página {filters.page} de {pages} · {formatNumber(list.pagination?.total)} registros</span><Button variant="secondary" disabled={filters.page >= pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</Button></div>
    </section>}

    {tab === 'import' && <section className="code-import-layout">
      <div className="card code-import-form">
        <header><Upload /><div><h2>Pegar códigos y correos</h2><p>Una línea por registro: <strong>CÓDIGO, correo@dominio.com</strong>. También acepta tabulador, punto y coma o barra vertical.</p></div></header>
        <textarea rows="13" value={importForm.text} onChange={(event) => { setImportForm({ ...importForm, text: event.target.value }); setValidation(null); }} placeholder={'BECA-DOC-001, docente@cabsa.com\nBECA-ALU-002, alumno@cabsa.com'} />
        <Input label="Correo común opcional (para líneas que sólo tengan código)" type="email" value={importForm.defaultEmail} onChange={(event) => setImportForm({ ...importForm, defaultEmail: event.target.value })} />
        <div className="code-form-grid">
          <label><span>Tipo de beca</span><select value={importForm.levelId} onChange={(event) => setImportForm({ ...importForm, levelId: event.target.value })}>{levels.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select></label>
          <Input label="Lote / nomenclatura" value={importForm.batch} onChange={(event) => setImportForm({ ...importForm, batch: event.target.value })} placeholder="DOCENTES-2026" />
          <Input label="Vigente desde" type="date" value={importForm.starts} onChange={(event) => setImportForm({ ...importForm, starts: event.target.value })} />
          <Input label="Vigente hasta" type="date" value={importForm.expires} onChange={(event) => setImportForm({ ...importForm, expires: event.target.value })} />
          <Input label="Usos permitidos" type="number" min="1" max="1000" value={importForm.maxUses} onChange={(event) => setImportForm({ ...importForm, maxUses: event.target.value })} />
          <Input label="Notas internas" value={importForm.notes} onChange={(event) => setImportForm({ ...importForm, notes: event.target.value })} />
        </div>
        <div className="code-import-actions"><Button variant="secondary" onClick={validateImport} disabled={saving}><FileCheck2 /> Validar sin guardar</Button><Button onClick={saveImport} disabled={saving || !validation || validation.errors.length}>{saving ? 'Procesando…' : 'Guardar o actualizar'}</Button></div>
      </div>
      <div className="card code-validation">
        <h2>Resultado de validación</h2>
        {!validation ? <EmptyState title="Pendiente de validación" description="Pega el listado y selecciona “Validar sin guardar”." /> : <>
          <div className="validation-summary"><span><strong>{validation.totalLines}</strong>Líneas</span><span className="green"><strong>{validation.newRows.length}</strong>Nuevos</span><span><strong>{validation.unchanged.length}</strong>Existentes</span><span className="gold"><strong>{validation.conflicts.length}</strong>Cambiarán correo</span><span className="red"><strong>{validation.errors.length}</strong>Errores</span></div>
          <ul className="validation-list">
            {validation.errors.slice(0, 15).map((row) => <li className="error" key={`${row.line}-${row.raw}`}><strong>Línea {row.line}:</strong> {row.reason} · {row.raw}</li>)}
            {validation.conflicts.slice(0, 15).map((row) => <li key={`${row.line}-${row.code}`}><strong>{row.code}:</strong> actualmente {row.currentEmail}; cambiará a {row.email}</li>)}
          </ul>
          <p>Duplicados en el listado: {validation.duplicateCodes.length} códigos, {validation.duplicateEmails.length} correos y {validation.duplicatePairs.length} pares exactos.</p>
        </>}
      </div>
    </section>}

    {tab === 'profiles' && <ScholarshipProfilesPanel setNotice={setNotice} onChanged={loadOverview} />}
    {tab === 'groups' && <GroupsPanel setNotice={setNotice} />}
    {tab === 'cleanup' && <CleanupPanel setNotice={setNotice} onChanged={() => Promise.all([loadOverview(), loadCodes()])} />}

    <Modal open={Boolean(editing)} title={`Editar ${editing?.code || ''}`} className="code-edit-modal" onClose={() => !saving && setEditing(null)}>
      {editValues && <form onSubmit={saveEdit}>
        <div className="code-form-grid">
          <Input label="Código" value={editValues.code} onChange={(event) => setEditValues({ ...editValues, code: event.target.value })} required />
          <Input label="Correo asignado" type="email" value={editValues.email} onChange={(event) => setEditValues({ ...editValues, email: event.target.value })} required />
          <label><span>Tipo de beca</span><select value={editValues.levelId} onChange={(event) => setEditValues({ ...editValues, levelId: event.target.value })}>{levels.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select></label>
          <label><span>Estado</span><select value={editValues.state} onChange={(event) => setEditValues({ ...editValues, state: event.target.value })}><option value="ACTIVE">Activo</option><option value="REVOKED">Revocado</option></select></label>
          <Input label="Vigente desde" type="date" value={editValues.starts} onChange={(event) => setEditValues({ ...editValues, starts: event.target.value })} />
          <Input label="Vigente hasta" type="date" value={editValues.expires} onChange={(event) => setEditValues({ ...editValues, expires: event.target.value })} />
          <Input label="Usos permitidos" type="number" min="1" value={editValues.maxUses} onChange={(event) => setEditValues({ ...editValues, maxUses: event.target.value })} />
          <Input label="Lote" value={editValues.batch} onChange={(event) => setEditValues({ ...editValues, batch: event.target.value })} />
        </div>
        <label className="field"><span>Notas internas</span><textarea rows="3" value={editValues.notes} onChange={(event) => setEditValues({ ...editValues, notes: event.target.value })} /></label>
        <div className="modal-actions"><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button></div>
      </form>}
    </Modal>
  </div>;
}

function CreateCodesPanel({ levels, setNotice, onCreated }) {
  const [form, setForm] = useState(initialCreate);
  const [preview, setPreview] = useState(null);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    if (!form.levelId && levels.length) {
      const preferred = levels.find((level) => Number(level.id) === 8) || levels[0];
      setForm((current) => ({ ...current, levelId: String(preferred.id) }));
    }
  }, [form.levelId, levels]);

  const recipients = [...new Set(form.emails.split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean))];
  const invalidRecipients = recipients.filter((email) => !validEmail(email));
  const change = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
  };
  const generate = async () => {
    if (!recipients.length) {
      setNotice({ error: true, text: 'Escribe al menos un correo destinatario.' });
      return;
    }
    if (invalidRecipients.length) {
      setNotice({ error: true, text: `Corrige estos correos: ${invalidRecipients.join(', ')}` });
      return;
    }
    if (!form.levelId) {
      setNotice({ error: true, text: 'Selecciona el tipo de membresía.' });
      return;
    }
    setWorking(true);
    try {
      const prefix = normalizePrefix(form.prefix);
      const batch = form.batch.trim() || `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
      const rows = recipients.map((email) => ({ email, code: `${prefix}-${randomToken()}` }));
      const text = rows.map((row) => `${row.code},${row.email}`).join('\n');
      const validation = await scholarshipCodesService.validate({ text });
      setPreview({ rows, text, validation, batch });
      setNotice(validation.conflicts.length
        ? { error: true, text: 'Uno de los códigos ya existe. Pulsa “Regenerar vista previa”.' }
        : { text: `${rows.length} código(s) preparados. Revisa la vista previa antes de guardar.` });
    } catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setWorking(false); }
  };
  const save = async () => {
    if (!preview || preview.validation.errors.length || preview.validation.conflicts.length) return;
    setWorking(true);
    try {
      const result = await scholarshipCodesService.import({
        ...form, text: preview.text, batch: preview.batch,
      });
      setNotice({ text: `${result.inserted} código(s) creados correctamente en el lote ${preview.batch}.` });
      await onCreated(preview.batch);
    } catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setWorking(false); }
  };

  return <section className="code-create-layout">
    <div className="card code-create-card">
      <header className="code-create-header"><div className="code-create-icon"><Sparkles /></div><div><h2>Crear códigos nuevos</h2><p>Cada código queda vinculado al correo indicado y sólo esa cuenta podrá activarlo.</p></div></header>
      <div className="code-create-steps"><span className="active">1. Destinatarios</span><span>2. Configuración</span><span>3. Revisar y guardar</span></div>
      <label className="field code-recipient-field"><span>Correos destinatarios</span><textarea rows="6" value={form.emails} onChange={(event) => change('emails', event.target.value)} placeholder={'alumno1@correo.com\nalumno2@correo.com'} /><small>Escribe uno por línea o sepáralos con coma. Se generará un código diferente para cada correo.</small></label>
      <div className="code-form-grid">
        <label><span>Tipo de membresía</span><select value={form.levelId} onChange={(event) => change('levelId', event.target.value)}><option value="">Selecciona una membresía</option>{levels.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select></label>
        <Input label="Prefijo del código" value={form.prefix} onChange={(event) => change('prefix', event.target.value)} placeholder="MEMB" />
        <Input label="Vigente desde (opcional)" type="date" value={form.starts} onChange={(event) => change('starts', event.target.value)} />
        <Input label="Vigente hasta (opcional)" type="date" value={form.expires} onChange={(event) => change('expires', event.target.value)} />
        <Input label="Usos permitidos" type="number" min="1" max="1000" value={form.maxUses} onChange={(event) => change('maxUses', event.target.value)} />
        <Input label="Nombre del lote (opcional)" value={form.batch} onChange={(event) => change('batch', event.target.value)} placeholder="ALUMNOS-AGOSTO-2026" />
      </div>
      <Input label="Notas internas (opcional)" value={form.notes} onChange={(event) => change('notes', event.target.value)} placeholder="Motivo o responsable de la entrega" />
      <div className="code-create-footer"><span><Mail /> {recipients.length} destinatario(s) único(s)</span><Button type="button" onClick={generate} disabled={working}>{working ? 'Preparando…' : preview ? 'Regenerar vista previa' : 'Generar vista previa'}</Button></div>
    </div>
    <aside className="card code-create-preview">
      <header><div><p className="eyebrow">Vista previa</p><h2>Códigos por crear</h2></div>{preview && <Badge tone="blue">Lote {preview.batch}</Badge>}</header>
      {!preview ? <EmptyState title="Aún no se han generado" description="Completa los destinatarios y la configuración; después genera una vista previa segura." /> : <>
        <div className="generated-code-summary"><strong>{preview.rows.length}</strong><span>códigos listos para guardarse</span></div>
        <div className="generated-code-list">{preview.rows.slice(0, 20).map((row) => <div key={row.code}><strong className="code-mono">{row.code}</strong><small>{row.email}</small></div>)}</div>
        {preview.rows.length > 20 && <p>Se muestran 20 de {preview.rows.length} códigos.</p>}
        <div className="code-save-note"><CheckCircle2 /><span>La vista previa no guarda datos. Confirma para crear los códigos.</span></div>
        <Button type="button" onClick={save} disabled={working || preview.validation.errors.length || preview.validation.conflicts.length}>{working ? 'Guardando…' : `Guardar ${preview.rows.length} código(s)`}</Button>
      </>}
    </aside>
  </section>;
}

function GroupsPanel({ setNotice }) {
  const [form, setForm] = useState({ term: '', mode: 'starts_with' });
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [endDate, setEndDate] = useState('');
  const search = async (event) => {
    event?.preventDefault();
    if (!form.term.trim()) return;
    setLoading(true);
    try { setGroup(await scholarshipCodesService.group(form)); setNotice(null); }
    catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setLoading(false); }
  };
  const updateGroup = async () => {
    if (!endDate || !window.confirm(`¿Actualizar la fecha de ${group.users.length} activaciones a ${endDate}?`)) return;
    try {
      const result = await scholarshipCodesService.updateGroupExpiry({ ...form, endDate });
      setNotice({ text: `Se actualizaron ${result.updated} activaciones del grupo.` });
      await search();
    } catch (error) { setNotice({ error: true, text: error.message }); }
  };
  const updateUser = async (user) => {
    const value = window.prompt(`Nueva fecha de vencimiento para ${user.display_name} (AAAA-MM-DD)`, user.activation_expires?.slice(0, 10) || '');
    if (!value) return;
    try {
      await scholarshipCodesService.updateUserExpiry(user.activation_id, value);
      setNotice({ text: `Vencimiento actualizado para ${user.display_name}.` });
      await search();
    } catch (error) { setNotice({ error: true, text: error.message }); }
  };
  const toggleActivation = async (user) => {
    const suspend = !user.suspended_at;
    const action = suspend ? 'desactivar temporalmente' : 'reactivar';
    if (!window.confirm(`¿${action} la beca de ${user.display_name}? La cuenta y todo su historial permanecerán guardados.`)) return;
    try {
      await scholarshipCodesService.setActivationSuspended(user.activation_id, suspend);
      setNotice({ text: suspend ? `Beca de ${user.display_name} desactivada temporalmente.` : `Beca de ${user.display_name} reactivada.` });
      await search();
    } catch (error) { setNotice({ error: true, text: error.message }); }
  };
  return <section className="group-manager">
    <form className="card group-search" onSubmit={search}><div><h2>Localizar grupo por nomenclatura</h2><p>Ejemplo: todos los códigos que empiezan con <strong>DOCENTE-2026</strong>.</p></div><input value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} placeholder="Nomenclatura" /><select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>{modes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><Button type="submit"><Search /> Analizar grupo</Button></form>
    {loading && <section className="card"><Loader label="Analizando grupo" /></section>}
    {!loading && !group && <section className="card"><EmptyState title="Selecciona un grupo" description="Busca una nomenclatura para ver códigos, activaciones y vencimientos." /></section>}
    {!loading && group && <><section className="group-stats"><div><strong>{group.stats.totalCodes}</strong><span>Códigos</span></div><div><strong>{group.stats.usedCodes}</strong><span>Utilizados</span></div><div><strong>{group.stats.mappedEmails}</strong><span>Con correo</span></div><div><strong>{group.stats.activatedUsers}</strong><span>Usuarios activados</span></div></section>
      <div className="card group-expiry"><div><h2>Vencimiento colectivo</h2><p>Actualiza la activación actual y la membresía histórica vinculada, cuando exista.</p></div><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /><Button onClick={updateGroup} disabled={!group.users.length}>Actualizar {group.users.length} usuarios</Button></div>
      <div className="card code-table"><header><h2>Usuarios activados</h2><Button variant="secondary" onClick={() => downloadCsv('usuarios-grupo-becas.csv', group.users)}><Download /> CSV</Button></header>{group.users.length ? <table><thead><tr><th>Usuario</th><th>Código</th><th>Beca</th><th>Acceso</th><th>Activación</th><th>Vencimiento</th><th>Membresía histórica</th><th></th></tr></thead><tbody>{group.users.map((user) => <tr key={user.activation_id}><td><strong>{user.display_name}</strong><small>{user.email}</small></td><td className="code-mono">{user.codigo}</td><td>{user.membership_name}</td><td><Badge tone={user.suspended_at ? 'gold' : 'green'}>{user.suspended_at ? 'Desactivada temporalmente' : 'Activa'}</Badge>{user.suspended_at && <small>{dateTime(user.suspended_at)}</small>}</td><td>{dateTime(user.activado_en)}</td><td>{date(user.activation_expires)}</td><td>{user.legacy_membership_id ? <><strong>{user.status}</strong><small>{date(user.enddate)}</small></> : 'No vinculada'}</td><td><div className="activation-actions"><Button variant="secondary" onClick={() => updateUser(user)}><Pencil /> Fecha</Button><Button variant={user.suspended_at ? 'secondary' : 'danger'} onClick={() => toggleActivation(user)}>{user.suspended_at ? <><RefreshCw /> Reactivar</> : <><ShieldX /> Desactivar</>}</Button></div></td></tr>)}</tbody></table> : <EmptyState title="Grupo sin activaciones" description="Los códigos existen, pero ningún usuario los ha activado en el sistema actual." />}</div>
      <div className="card code-table"><header><h2>Códigos del grupo</h2><Button variant="secondary" onClick={() => downloadCsv('codigos-grupo-becas.csv', group.codes)}><Download /> CSV</Button></header><table><thead><tr><th>Código</th><th>Correo</th><th>Beca</th><th>Vigencia</th><th>Uso</th><th>Estado</th></tr></thead><tbody>{group.codes.map((row) => <tr key={row.id}><td className="code-mono">{row.code}</td><td>{row.allowed_email}</td><td>{row.membership_name}</td><td>{date(row.vigente_desde)} — {date(row.vigente_hasta)}</td><td>{row.usos_historicos} / {row.max_usos}</td><td><Badge tone={row.used ? 'gold' : 'green'}>{row.used ? 'Utilizado' : row.estado}</Badge></td></tr>)}</tbody></table></div>
    </>}
  </section>;
}

function CleanupPanel({ setNotice, onChanged }) {
  const [form, setForm] = useState({ term: '', mode: 'starts_with', confirmation: '' });
  const [preview, setPreview] = useState(null);
  const [working, setWorking] = useState(false);
  const runPreview = async () => {
    setWorking(true);
    try { setPreview(await scholarshipCodesService.previewPattern(form)); setNotice(null); }
    catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setWorking(false); }
  };
  const remove = async () => {
    setWorking(true);
    try {
      const result = await scholarshipCodesService.removePattern(form);
      setNotice({ text: `Limpieza terminada: ${result.deleted} códigos sin uso eliminados y ${result.revoked} códigos con historial revocados.` });
      setPreview(null);
      setForm({ ...form, confirmation: '' });
      await onChanged();
    } catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setWorking(false); }
  };
  const normalized = form.term.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return <section className="cleanup-layout">
    <div className="card cleanup-form"><AlertTriangle /><div><h2>Limpieza segura por nomenclatura</h2><p>Primero previsualiza. Los códigos sin historial se eliminan; los utilizados se revocan para conservar la auditoría y las activaciones existentes.</p></div><label><span>Patrón del código</span><input value={form.term} onChange={(event) => { setForm({ ...form, term: event.target.value, confirmation: '' }); setPreview(null); }} placeholder="DOCENTE-2025" /></label><label><span>Coincidencia</span><select value={form.mode} onChange={(event) => { setForm({ ...form, mode: event.target.value }); setPreview(null); }}>{modes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><Button variant="secondary" onClick={runPreview} disabled={working}><Search /> Previsualizar</Button></div>
    {preview && <div className="card cleanup-preview"><header><div><h2>{preview.total} coincidencias</h2><p>{preview.used} tienen historial y serán revocadas; {preview.total - preview.used} se pueden eliminar.</p></div><Button variant="secondary" onClick={() => downloadCsv('previsualizacion-limpieza-codigos.csv', preview.rows)}><Download /> CSV</Button></header><div className="cleanup-codes">{preview.rows.slice(0, 100).map((row) => <span key={row.id}><strong>{row.code}</strong><small>{row.allowed_email}</small></span>)}</div>{preview.total > 100 && <p>Se muestran las primeras 100 coincidencias. Descarga el CSV para revisar el listado.</p>}<label className="danger-confirm"><span>Para confirmar escribe <strong>ELIMINAR {normalized}</strong></span><input value={form.confirmation} onChange={(event) => setForm({ ...form, confirmation: event.target.value })} /></label><Button variant="danger" onClick={remove} disabled={working || form.confirmation !== `ELIMINAR ${normalized}`}><Trash2 /> Ejecutar limpieza</Button></div>}
  </section>;
}
