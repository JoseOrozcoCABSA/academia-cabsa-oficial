import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, MapPin, Pencil, RefreshCw, Search, ShieldAlert, UserCheck, UserPlus, Users, UsersRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, EmptyState, Loader, Modal } from '@/components/common';
import { userDashboardService } from '@/services/userDashboardService';
import { parseRosterFile } from './rosterFile';
import './user-dashboard.css';
import './user-directory-improvements.css';

const fmt = (v) => new Intl.NumberFormat('es-MX').format(Number(v || 0));
const show = (v) => String(v ?? '').trim() || 'Sin información';
const date = (v) => v ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(v)) : 'Nunca';
const unique = (rows, key) => [...new Set(rows.map((row) => show(row[key])))].sort();
const counts = (rows, key) => Object.entries(rows.reduce((all, row) => {
  const label = show(row[key]); all[label] = (all[label] || 0) + 1; return all;
}, {})).sort((a, b) => b[1] - a[1]);
const emptyFilters = { q: '', status: '', state: '', group: '', municipality: '', geo: '', membership: '', activity: '', identity: '', grouped: false };
const csv = (rows) => {
  const columns = ['wp_user_id', 'usuario', 'correo', 'nombre_visible', 'rfc', 'estado_cuenta', 'estado_oficial', 'municipio_oficial', 'codigo_postal', 'colonia', 'grupos', 'membresias', 'estatus_geografico', 'estatus_identidad', 'ultimo_login', 'total_inicios_sesion'];
  const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const content = [columns, ...rows.map((row) => columns.map((key) => row[key]))].map((row) => row.map(quote).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'usuarios-cabsa-filtrados.csv'; link.click(); URL.revokeObjectURL(url);
};

function Metric({ Icon, label, total, note, active, action }) {
  return <button type="button" className={`user-metric card ${active ? 'active' : ''}`} onClick={action}><Icon /><span><small>{label}</small><strong>{fmt(total)}</strong><p>{note}</p></span></button>;
}
function Bars({ title, rows, selected, onSelect, tone = '' }) {
  const max = Math.max(1, ...rows.map((row) => Number(row[1])));
  return <section className="card user-bars"><h2>{title}</h2>{rows.slice(0, 12).map(([label, total]) => <button type="button" className={selected === label ? 'selected' : ''} onClick={() => onSelect(selected === label ? '' : label)} key={label}><span>{label}</span><i><b className={tone} style={{ width: `${Number(total) / max * 100}%` }} /></i><strong>{fmt(total)}</strong></button>)}</section>;
}

export default function UserDashboard() {
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get('vista');
  const initialMode = ['accounts', 'official', 'pending'].includes(requestedMode) ? requestedMode : 'accounts';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState(initialMode);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => {
    setLoading(true); setError('');
    return userDashboardService.overview().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (['accounts', 'official', 'pending'].includes(requestedMode)) {
      setMode(requestedMode);
      setFilters(emptyFilters);
    }
  }, [requestedMode]);
  const accounts = data?.accounts || [], users = data?.users || [];
  const pending = data?.pending || [], baseGroups = data?.groups || [];
  const groups = baseGroups;
  const source = mode === 'pending' ? pending : mode === 'official' ? users : accounts;
  const filtered = useMemo(() => {
    const now = Date.now();
    return source.filter((u) => {
      const login = u.modern_last_login || u.ultimo_login;
      const activity = filters.activity === 'never' ? !login : filters.activity ? Boolean(login) && now - new Date(login).getTime() <= Number(filters.activity) * 86400000 : true;
      return [u.nombre_visible, u.usuario, u.correo, u.rfc, u.nombre, u.apellidos].join(' ').toLowerCase().includes(filters.q.toLowerCase())
        && (!filters.status || u.modern_status === filters.status)
        && (!filters.state || show(u.estado_oficial) === filters.state)
        && (!filters.municipality || show(u.municipio_oficial) === filters.municipality)
        && (!filters.group || (filters.group === '__NONE__' ? !Number(u.total_grupos) : String(u.grupos || '').split(', ').includes(filters.group)))
        && (!filters.geo || u.estatus_geografico === filters.geo)
        && (filters.membership === '' || Number(u.membresia_activa) === Number(filters.membership))
        && (!filters.identity || u.estatus_identidad === filters.identity)
        && (!filters.grouped || Number(u.total_grupos) > 0) && activity;
    });
  }, [filters, source]);
  useEffect(() => { setPage(1); }, [filters, mode]);
  if (loading) return <div className="page admin-page"><section className="card"><Loader label="Construyendo panorama de usuarios" /></section></div>;
  const set = (key, value) => setFilters((old) => ({ ...old, [key]: value }));
  const flow = data?.flow || {};
  const membership = accounts.filter((u) => Number(u.membresia_activa)).length;
  const selection = {
    group: filtered.filter((u) => Number(u.total_grupos)).length,
    membership: filtered.filter((u) => Number(u.membresia_activa)).length,
    geography: filtered.filter((u) => u.estatus_geografico === 'completo').length,
    sessions: filtered.reduce((sum, u) => sum + Number(u.total_inicios_sesion || 0), 0),
  };
  const pages = Math.max(1, Math.ceil(filtered.length / 30));
  const visible = filtered.slice((page - 1) * 30, page * 30);
  const saved = async (message) => { setEditing(null); setNotice(message); await load(); };
  return <div className="page admin-page user-dashboard">
    <div className="page-heading"><div><p className="eyebrow">Usuarios · Directorio</p><h1>Directorio de usuarios</h1><p>Consulta y edita cuentas registradas, perfiles históricos y solicitudes pendientes. La creación de grupos y los padrones se administran en su módulo independiente.</p></div><div className="user-actions"><Button variant="secondary" onClick={load}><RefreshCw /> Actualizar directorio</Button></div></div>
    {error && <div className="alert alert--error">{error}</div>}{notice && <div className="source-note">{notice}</div>}
    <section id="vistas-directorio" className="user-metric-grid">
      <Metric Icon={Users} label="Cuentas registradas" total={accounts.length} note="Todas las altas de acceso" active={mode === 'accounts'} action={() => { setMode('accounts'); setFilters(emptyFilters); }} />
      <Metric Icon={UserPlus} label="Nuevas sin perfil" total={flow.cuentas_sin_perfil} note="Altas exclusivas de la plataforma" active={mode === 'accounts' && filters.identity === 'cuenta_nueva'} action={() => { setMode('accounts'); setFilters({ ...emptyFilters, identity: 'cuenta_nueva' }); }} />
      <Metric Icon={UsersRound} label="Perfiles históricos" total={users.length} note="Directorio heredado" active={mode === 'official'} action={() => { setMode('official'); setFilters(emptyFilters); }} />
      <Metric Icon={UserCheck} label="Membresía activa" total={membership} note={`${accounts.length ? (membership / accounts.length * 100).toFixed(1) : 0}% de las cuentas`} active={filters.membership === '1'} action={() => { setMode('accounts'); setFilters({ ...emptyFilters, membership: '1' }); }} />
      <Metric Icon={MapPin} label="Por verificar" total={flow.cuentas_por_verificar} note="Falta confirmar el correo" active={mode === 'accounts' && filters.status === 'PENDING'} action={() => { setMode('accounts'); setFilters({ ...emptyFilters, status: 'PENDING' }); }} />
      <Metric Icon={ShieldAlert} label="Alertas identidad" total={flow.alertas_identidad} note="Duplicados probables" active={filters.identity === 'duplicado_probable'} action={() => { setMode('official'); set('identity', filters.identity === 'duplicado_probable' ? '' : 'duplicado_probable'); }} />
    </section>
    <nav className="user-directory-tabs" aria-label="Tipo de registro">
      <button type="button" className={mode === 'accounts' ? 'active' : ''} onClick={() => { setMode('accounts'); setFilters(emptyFilters); }}>Cuentas registradas <strong>{fmt(accounts.length)}</strong><small>Altas reales de la plataforma</small></button>
      <button type="button" className={mode === 'official' ? 'active' : ''} onClick={() => { setMode('official'); setFilters(emptyFilters); }}>Perfiles históricos <strong>{fmt(users.length)}</strong><small>Directorio heredado y validado</small></button>
      <button type="button" className={mode === 'pending' ? 'active' : ''} onClick={() => { setMode('pending'); setFilters(emptyFilters); }}>Solicitudes pendientes <strong>{fmt(pending.length)}</strong><small>Registros aún no activados</small></button>
    </nav>
    <section id="consulta-exportacion" className="user-filters card">
      <label className="search"><Search /><input value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="Nombre, correo, RFC o usuario" /></label>
      <select value={filters.status} onChange={(e) => set('status', e.target.value)}><option value="">Cualquier estado</option><option value="ACTIVE">Activa</option><option value="PENDING">Por verificar</option><option value="SUSPENDED">Suspendida</option><option value="DISABLED">Deshabilitada</option></select>
      <select value={filters.state} onChange={(e) => { set('state', e.target.value); set('municipality', ''); }}><option value="">Todos los estados</option>{unique(source, 'estado_oficial').map((x) => <option key={x}>{x}</option>)}</select>
      <select value={filters.group} onChange={(e) => set('group', e.target.value)}><option value="">Todos los grupos</option><option value="__NONE__">Usuarios sin grupo</option>{groups.map((g) => <option value={g.nombre} key={g.id}>{g.nombre}</option>)}</select>
      <select value={filters.municipality} onChange={(e) => { set('municipality', e.target.value); set('state', ''); }}><option value="">Todos los municipios</option>{unique(source, 'municipio_oficial').map((x) => <option key={x}>{x}</option>)}</select>
      <select value={filters.geo} onChange={(e) => set('geo', e.target.value)}><option value="">Calidad geográfica</option><option value="completo">Completa</option><option value="parcial">Parcial</option><option value="pendiente">Pendiente</option></select>
      <select value={filters.membership} onChange={(e) => set('membership', e.target.value)}><option value="">Cualquier membresía</option><option value="1">Activa</option><option value="0">Sin activa</option></select>
      <select value={filters.activity} onChange={(e) => set('activity', e.target.value)}><option value="">Cualquier actividad</option><option value="30">Login últimos 30 días</option><option value="90">Login últimos 90 días</option><option value="never">Nunca inició sesión</option></select>
      <select value={filters.identity} onChange={(e) => set('identity', e.target.value)}><option value="">Cualquier identidad</option><option value="cuenta_nueva">Cuenta nueva sin perfil histórico</option><option value="correcto">Correcta</option><option value="duplicado_probable">Duplicado probable</option><option value="incompleto">Incompleta</option></select>
      <Button variant="secondary" onClick={() => setFilters(emptyFilters)}>Limpiar</Button>
    </section>
    <section className="selection-grid">{[
      [mode === 'pending' ? 'Pendientes seleccionados' : mode === 'official' ? 'Perfiles seleccionados' : 'Cuentas seleccionadas', fmt(filtered.length), `de ${fmt(source.length)}`],
      ['Porcentaje', `${source.length ? (filtered.length / source.length * 100).toFixed(1) : 0}%`, 'del conjunto'],
      ['Con grupo', fmt(selection.group), `${filtered.length ? (selection.group / filtered.length * 100).toFixed(1) : 0}%`],
      ['Membresía activa', fmt(selection.membership), `${filtered.length ? (selection.membership / filtered.length * 100).toFixed(1) : 0}%`],
      ['Geografía completa', fmt(selection.geography), `${filtered.length ? (selection.geography / filtered.length * 100).toFixed(1) : 0}%`],
      ['Sesiones acumuladas', fmt(selection.sessions), `${filtered.length ? (selection.sessions / filtered.length).toFixed(1) : 0} promedio`],
    ].map(([label, total, note]) => <div key={label}><small>{label}</small><strong>{total}</strong><span>{note}</span></div>)}</section>
    <section className="user-chart-grid">
      <Bars title="Usuarios por estado" rows={counts(source, 'estado_oficial')} selected={filters.state} onSelect={(v) => { set('state', v); set('municipality', ''); }} />
      <Bars title="Grupos CABSA" rows={groups.map((g) => [g.nombre, g.miembros])} selected={filters.group} onSelect={(v) => set('group', v)} tone="green" />
      <Bars title="Municipios" rows={counts(filters.state ? source.filter((u) => show(u.estado_oficial) === filters.state) : source, 'municipio_oficial').filter(([x]) => x !== 'Sin información')} selected={filters.municipality} onSelect={(v) => { set('municipality', v); set('state', ''); }} tone="violet" />
    </section>
    <section className="card user-directory"><header><div><h2>{mode === 'pending' ? 'Solicitudes pendientes' : mode === 'official' ? 'Perfiles históricos' : 'Cuentas registradas'} · {fmt(filtered.length)}</h2><p>{source.length ? (filtered.length / source.length * 100).toFixed(1) : 0}% del conjunto</p></div><Button variant="secondary" onClick={() => csv(filtered)}><Download /> Exportar CSV</Button></header>
      {visible.length ? <div className="user-table"><table><thead><tr><th>Usuario y cuenta</th><th>Correo</th><th>Estado / municipio</th><th>Grupo</th><th>Geografía</th><th>{mode === 'accounts' ? 'Origen' : 'Identidad'}</th><th>Membresía</th><th>Último login</th><th>Sesiones</th><th></th></tr></thead><tbody>{visible.map((u) => <tr key={`${mode}-${u.account_id || u.id}`} onClick={() => setDetail(u)}><td><strong>{u.nombre_visible || u.usuario}</strong><small>@{u.usuario} · {u.estado_cuenta || 'sin estado'}</small></td><td>{u.correo}</td><td>{show(u.estado_oficial)}<small>{show(u.municipio_oficial)}</small></td><td>{u.grupos || 'Sin grupo'}</td><td><Badge tone={u.estatus_geografico === 'completo' ? 'green' : u.estatus_geografico === 'parcial' ? 'gold' : 'neutral'}>{u.estatus_geografico}</Badge></td><td><Badge tone={u.estatus_identidad === 'correcto' ? 'green' : u.estatus_identidad === 'duplicado_probable' ? 'red' : 'gold'}>{u.estatus_identidad === 'cuenta_nueva' ? 'Cuenta nueva' : u.estatus_identidad}</Badge></td><td><Badge tone={Number(u.membresia_activa) ? 'green' : 'neutral'}>{Number(u.membresia_activa) ? 'Activa' : 'Sin activa'}</Badge></td><td>{date(u.modern_last_login || u.ultimo_login)}</td><td>{fmt(u.total_inicios_sesion)}</td><td>{mode !== 'pending' && <button type="button" onClick={(e) => { e.stopPropagation(); setEditing({ ...u, _directoryMode: mode }); }}><Pencil /></button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No hay resultados" description="Cambia alguno de los filtros." />}
      <footer><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page} de {pages}</span><Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</Button></footer>
    </section>
    <Detail user={detail} close={() => setDetail(null)} />
    <Editor user={editing} close={() => setEditing(null)} saved={saved} />
  </div>;
}

function Detail({ user, close }) {
  const fields = user ? [['Usuario', user.usuario], ['Correo', user.correo], ['Estado de cuenta', user.estado_cuenta], ['Tipo de registro', user.tipo_registro === 'cuenta_plataforma' ? 'Cuenta nueva de la plataforma' : user.tipo_registro || 'Perfil histórico'], ['Fecha de registro', date(user.fecha_registro)], ['Roles', user.roles || 'Sin rol asignado'], ['RFC', user.rfc || 'Sin capturar'], ['Estado', show(user.estado_oficial)], ['Municipio', show(user.municipio_oficial)], ['CP / colonia', [user.codigo_postal, user.colonia].filter(Boolean).join(' · ') || 'Sin completar'], ['Región', user.region_administrativa || 'Sin asignar'], ['Coordinador', user.coordinador || 'Sin asignar'], ['Grupos', user.grupos || 'Sin grupo'], ['Membresías', user.membresias || 'Sin membresía activa'], ['Último login', date(user.modern_last_login || user.ultimo_login)], ['Sesiones', fmt(user.total_inicios_sesion)], ['Observaciones', user.observaciones_calidad || 'Sin observaciones']] : [];
  return <Modal open={Boolean(user)} title={user?.nombre_visible || user?.usuario || ''} className="user-detail-modal" onClose={close}><div className="user-detail">{fields.map(([k, v]) => <div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div></Modal>;
}
function Editor({ user, close, saved }) {
  const [form, setForm] = useState({}), [busy, setBusy] = useState(false);
  const accountMode = user?._directoryMode === 'accounts';
  useEffect(() => {
    if (!user) return;
    if (user._directoryMode === 'accounts') {
      setForm({ username: user.usuario || '', email: user.correo || '', displayName: user.nombre_visible || '', firstName: user.nombre || '', lastName: user.apellidos || '', status: user.modern_status || 'ACTIVE' });
    } else {
      setForm({ email: user.correo || '', displayName: user.nombre_visible || '', firstName: user.nombre || '', lastName: user.apellidos || '', rfc: user.rfc || '', region: user.region_administrativa || '', coordinator: user.coordinador || '', municipality: user.municipio_oficial || '', state: user.estado_oficial || '', postalCode: user.codigo_postal || '', neighborhood: user.colonia || '', accountStatus: user.estado_cuenta || 'activo' });
    }
  }, [user]);
  const execute = async (task, message) => { setBusy(true); try { await task(); await saved(message); } finally { setBusy(false); } };
  const submit = (event) => {
    event.preventDefault();
    if (accountMode) execute(() => userDashboardService.updateAccount(user.account_id, form), 'Cuenta de acceso actualizada correctamente.');
    else execute(() => userDashboardService.updateOfficial(user.id, form), 'Perfil histórico y cuenta vinculada actualizados.');
  };
  const accountFields = { username: 'Nombre de usuario', email: 'Correo', displayName: 'Nombre visible', firstName: 'Nombre(s)', lastName: 'Apellidos' };
  const officialFields = { displayName: 'Nombre visible', email: 'Correo', firstName: 'Nombre(s)', lastName: 'Apellidos', rfc: 'RFC', region: 'Región', coordinator: 'Coordinador', state: 'Estado', municipality: 'Municipio', postalCode: 'Código postal', neighborhood: 'Colonia' };
  return <Modal open={Boolean(user)} title={`Editar ${user?.nombre_visible || ''}`} className="user-editor-modal" onClose={close}>{user && <form onSubmit={submit}>
    <div className="user-editor-context"><strong>{accountMode ? 'Cuenta registrada' : 'Perfil histórico'}</strong><span>{accountMode ? 'Edita el acceso real con el que inicia sesión.' : 'Edita los datos heredados y su cuenta vinculada.'}</span></div>
    <div className="user-edit">{Object.entries(accountMode ? accountFields : officialFields).map(([key, label]) => <label key={key}><span>{label}</span><input type={key === 'email' ? 'email' : 'text'} value={form[key] || ''} required={['username', 'email', 'displayName'].includes(key)} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
      {accountMode ? <label><span>Estado de acceso</span><select value={form.status || 'ACTIVE'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="PENDING">Pendiente de verificar</option><option value="ACTIVE">Activa</option><option value="SUSPENDED">Suspendida</option><option value="DISABLED">Deshabilitada</option></select></label> : <label><span>Cuenta</span><select value={form.accountStatus || 'activo'} onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}><option value="activo">Activa</option><option value="inactivo">Inactiva</option></select></label>}
    </div>
    {!accountMode && <div className="source-note">La pertenencia a padrones esperados se calcula por RFC o correo; no se asigna manualmente desde el perfil.</div>}
    <div className="modal-actions"><Button type="button" variant="secondary" onClick={close}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button></div>
  </form>}</Modal>;
}
export function Groups({ open, groups, close, saved }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setError('');
    try {
      if (editing) { await userDashboardService.updateGroup(editing.id, form); setEditing(null); await saved('Grupo actualizado correctamente.'); }
      else {
        if (!file) throw new Error('Selecciona el Excel o CSV que dará origen al grupo. No se permiten grupos vacíos.');
        const parsed = await parseRosterFile(file);
        const created = await userDashboardService.createGroup(form);
        await userDashboardService.importRoster(created.id, { ...parsed, levelId: null, starts: '', expires: '', syncCodes: false });
        await saved(`Grupo creado desde ${parsed.fileName} con ${parsed.rows.length} filas. RFC se utilizó como identificador principal.`);
      }
      setForm({ name: '', description: '', state: '', municipality: '' }); setFile(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el grupo.'); }
  };
  const edit = (group) => { setEditing(group); setForm({ name: group.nombre || '', description: group.descripcion || '', state: group.estado || '', municipality: group.municipio || '' }); };
  const cancel = () => { setEditing(null); setForm({ name: '', description: '', state: '', municipality: '' }); };
  return <Modal open={open} title="Administrar padrones esperados" className="group-modal" onClose={close}>{error && <div className="alert alert--error">{error}</div>}<div className="source-note">Cada padrón procede de un CSV o Excel. Compara personas esperadas contra cuentas registradas; no crea grupos docentes ni consume sus lugares.</div><form className="group-create" onSubmit={submit}><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del padrón o institución" required /><input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" /><input value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Estado" /><input value={form.municipality || ''} onChange={(e) => setForm({ ...form, municipality: e.target.value })} placeholder="Municipio" />{!editing && <label className="group-file"><span>Excel o CSV de origen (obligatorio)</span><input type="file" accept=".xlsx,.xls,.csv" required onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>}<Button type="submit">{editing ? 'Guardar padrón' : 'Crear padrón desde archivo'}</Button>{editing && <Button type="button" variant="secondary" onClick={cancel}>Cancelar edición</Button>}</form><div className="group-list">{groups.map((g) => { const protectedGroup = Number(g.padron_total) > 0; return <div key={g.id}><span><strong>{g.nombre}</strong><small>{g.padron_registrados || 0} de {g.padron_total || 0} personas ya registradas</small><small>{g.padron_pendientes || 0} pendientes · {g.padron_no_registrados || 0} sin registro · {g.municipio || g.estado || 'Sin ubicación'}</small><small>{protectedGroup ? 'Conservado porque contiene historial de importación.' : 'Padrón vacío: se puede eliminar.'}</small></span><div><Button variant="secondary" onClick={() => edit(g)}>Editar</Button><Button variant="danger" disabled={protectedGroup} onClick={async () => { if (window.confirm(`¿Eliminar definitivamente el padrón vacío ${g.nombre}?`)) { await userDashboardService.removeGroup(g.id); await saved('Padrón vacío eliminado.'); } }}>Eliminar vacío</Button></div></div>; })}</div></Modal>;
}

export function GroupAnalytics({ groups, loading, error, retry }) {
  const [search, setSearch] = useState('');
  const withRoster = groups.filter((group) => Number(group.padron_total));
  const visible = withRoster.filter((group) => [group.nombre, group.estado, group.municipio].join(' ').toLowerCase().includes(search.toLowerCase()));
  const total = withRoster.reduce((sum, group) => sum + Number(group.padron_total || 0), 0);
  const registered = withRoster.reduce((sum, group) => sum + Number(group.padron_registrados || 0), 0);
  const pending = withRoster.reduce((sum, group) => sum + Number(group.padron_pendientes || 0), 0);
  const central = withRoster.reduce((sum, group) => sum + Number(group.padron_base_central || 0), 0);
  return <section className="card group-analytics"><header><div><p className="eyebrow">Analítica de grupos</p><h2>Registro, cuenta y base central</h2><p>RFC es la coincidencia prioritaria; correo y código se usan como respaldo.</p></div><label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo, estado o municipio" /></label></header>{loading && <Loader label="Calculando coincidencias de padrones" />}{error && <div className="alert alert--error">No se pudo cargar esta comparación: {error} <Button variant="secondary" onClick={retry}>Reintentar</Button></div>}{!loading && !error && <><div className="group-analytics-metrics"><div><small>Grupos con padrón</small><strong>{fmt(withRoster.length)}</strong></div><div><small>Filas analizadas</small><strong>{fmt(total)}</strong></div><div><small>Con cuenta</small><strong>{fmt(registered)}</strong><span>{total ? (registered / total * 100).toFixed(1) : 0}%</span></div><div><small>Pendientes</small><strong>{fmt(pending)}</strong></div><div><small>En base central</small><strong>{fmt(central)}</strong><span>{total ? (central / total * 100).toFixed(1) : 0}%</span></div></div><div className="table-scroll"><table><thead><tr><th>Grupo</th><th>Padrón</th><th>Con cuenta</th><th>Pendientes</th><th>Sin cuenta</th><th>Base central</th><th>Cobertura</th></tr></thead><tbody>{visible.map((group) => { const rows = Number(group.padron_total || 0); const found = Number(group.padron_registrados || 0); return <tr key={group.id}><td><strong>{group.nombre}</strong><small>{group.municipio || group.estado || 'Sin ubicación'}</small></td><td>{fmt(rows)}</td><td>{fmt(found)}</td><td>{fmt(group.padron_pendientes)}</td><td>{fmt(group.padron_no_registrados)}</td><td>{fmt(group.padron_base_central)}</td><td>{rows ? (found / rows * 100).toFixed(1) : 0}%</td></tr>; })}</tbody></table></div></>}</section>;
}
