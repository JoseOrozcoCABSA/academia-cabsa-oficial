import { useCallback, useEffect, useMemo, useState } from 'react';
import readXlsxFile, { readSheetNames } from 'read-excel-file';
import { CalendarClock, Download, FileSpreadsheet, History, RefreshCw, ShieldOff, Upload, UsersRound } from 'lucide-react';
import { Badge, Button, EmptyState, Loader } from '@/components/common';
import { userDashboardService } from '@/services/userDashboardService';
import './excel-analysis.css';

const cleanHeader = (value) => String(value ?? '').trim().toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replaceAll('_', ' ').replace(/\s+/g, ' ');
const aliases = {
  email: ['correo', 'email', 'correo electronico', 'e-mail', 'correo encontrado sistema oficial'],
  code: ['codigo', 'codigo beca', 'clave oficial', 'codigo sistema oficial'],
  rfc: ['rfc', 'rfc por correo'],
  name: ['nombre', 'nombre completo', 'socio', 'alumno', 'docente', 'nombre docente'],
  username: ['usuario', 'username', 'nombre de usuario'],
};
const findColumn = (headers, names) => headers.findIndex((header) => names.includes(cleanHeader(header)));
const csvRows = (text) => text.split(/\r?\n/).filter(Boolean).map((line) => {
  const cells = []; let value = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(value); value = ''; }
    else value += char;
  }
  cells.push(value); return cells;
});
const formatDate = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value)) : 'Sin vencimiento';
const labels = {
  REGISTERED: 'Registrado', PENDING: 'Registro pendiente', UNREGISTERED: 'No registrado',
  WITHOUT_SCHOLARSHIP: 'Sin beca', ACTIVE: 'Beca activa', INDEFINITE: 'Acceso indefinido',
  SUSPENDED: 'Beca suspendida', EXPIRED: 'Beca vencida',
};
const tone = (status) => ({ REGISTERED: 'green', ACTIVE: 'green', INDEFINITE: 'green', PENDING: 'gold', SUSPENDED: 'gold', EXPIRED: 'red', UNREGISTERED: 'red' }[status] || 'gray');
const exportRows = (rows, groupName) => {
  const columns = ['fila', 'nombre', 'correo', 'codigo', 'rfc', 'registro', 'cuenta', 'beca', 'vencimiento'];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const content = [columns, ...rows.map((row) => [row.numero_fila, row.nombre, row.correo, row.codigo, row.rfc, labels[row.registration_status], row.account_name, labels[row.scholarship_status], row.scholarship_expires])]
    .map((row) => row.map(quote).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `padron-${String(groupName || 'grupo').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`; link.click(); URL.revokeObjectURL(url);
};

export default function ExcelAnalysis({ groups, onGroupsChanged }) {
  const [groupId, setGroupId] = useState('');
  const [file, setFile] = useState(null), [sheets, setSheets] = useState([]), [sheet, setSheet] = useState('');
  const [parsed, setParsed] = useState(null);
  const [roster, setRoster] = useState(null), [history, setHistory] = useState(null);
  const [filter, setFilter] = useState(''), [search, setSearch] = useState('');
  const [endDate, setEndDate] = useState(''), [days, setDays] = useState('30');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');

  const loadRoster = useCallback(async (selected = groupId, selectedFilter = filter, selectedSearch = search) => {
    if (!selected) { setRoster(null); setHistory(null); return; }
    setBusy(true); setError('');
    try {
      const [current, changes] = await Promise.all([
        userDashboardService.roster(selected, { status: selectedFilter, search: selectedSearch }),
        userDashboardService.rosterHistory(selected),
      ]);
      setRoster(current); setHistory(changes);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, [filter, groupId, search]);
  useEffect(() => { loadRoster(groupId, '', ''); setFilter(''); setSearch(''); }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const parseFile = async (selectedFile, selectedSheet = '') => {
    if (!selectedFile) return;
    setBusy(true); setError(''); setNotice('');
    try {
      let matrix;
      let sheetNames = [];
      if (selectedFile.name.toLowerCase().endsWith('.csv')) matrix = csvRows(await selectedFile.text());
      else {
        sheetNames = await readSheetNames(selectedFile);
        const targetSheet = selectedSheet || sheetNames[0];
        matrix = await readXlsxFile(selectedFile, { sheet: targetSheet });
        setSheets(sheetNames); setSheet(targetSheet);
      }
      if (matrix.length < 2) throw new Error('La hoja no contiene filas para comparar.');
      const headers = matrix[0];
      const positions = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, findColumn(headers, names)]));
      if (positions.email < 0 && positions.code < 0) throw new Error('No se encontró una columna de Correo o Código de beca.');
      const rows = matrix.slice(1).map((row, index) => ({
        line: index + 2,
        ...Object.fromEntries(Object.keys(positions).map((key) => [key, positions[key] >= 0 ? String(row[positions[key]] ?? '').trim() : ''])),
      })).filter((row) => row.email || row.code || row.rfc || row.name || row.username);
      if (!rows.length) throw new Error('No se encontraron filas con información útil.');
      setParsed({ fileName: selectedFile.name, sheetName: selectedSheet || sheetNames[0] || 'CSV', rows, headers: Object.fromEntries(Object.entries(positions).map(([key, position]) => [key, position >= 0 ? headers[position] : null])) });
    } catch (e) { setParsed(null); setError(e.message); } finally { setBusy(false); }
  };
  const chooseFile = async (selected) => { setFile(selected); setSheets([]); setSheet(''); await parseFile(selected); };
  const changeSheet = async (value) => { setSheet(value); await parseFile(file, value); };
  const save = async () => {
    if (!groupId || !parsed) return;
    setBusy(true); setError('');
    try {
      const result = await userDashboardService.importRoster(groupId, {
        ...parsed, levelId: null, starts: null, expires: null, syncCodes: false,
      });
      setNotice(`Padrón guardado: ${result.total} filas. Se conservaron las cargas anteriores en el historial.`);
      setParsed(null); setFile(null); await loadRoster(groupId, '', ''); await onGroupsChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const applyAction = async (action) => {
    const names = { SUSPEND: 'suspender las becas', REACTIVATE: 'reactivar las becas', SET_EXPIRY: 'cambiar el vencimiento', EXTEND_DAYS: 'ampliar la vigencia', INDEFINITE: 'dar acceso indefinido' };
    if (!window.confirm(`¿Confirmas ${names[action]} de las cuentas registradas en este padrón? La acción quedará en el historial.`)) return;
    setBusy(true); setError('');
    try {
      const result = await userDashboardService.rosterAction(groupId, { action, endDate, days: Number(days) });
      setNotice(`${result.affected} activación(es) actualizadas. La cuenta y el historial del alumno se conservaron.`);
      await loadRoster();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const restoreImport = async (importId) => {
    if (!window.confirm('¿Restaurar esta carga como padrón vigente? La carga actual seguirá conservada en el historial.')) return;
    setBusy(true); setError('');
    try {
      const result = await userDashboardService.restoreRoster(groupId, importId);
      setNotice(`Se restauró el padrón histórico de ${result.total} filas.`);
      await loadRoster(groupId, '', ''); await onGroupsChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const summary = roster?.summary;
  const metrics = useMemo(() => summary ? [
    ['REGISTERED', 'Registrados', summary.registered], ['PENDING', 'Pendientes', summary.pending],
    ['UNREGISTERED', 'No registrados', summary.unregistered], ['ACTIVE', 'Beca activa', summary.active_scholarships],
    ['WITHOUT_SCHOLARSHIP', 'Registrados sin beca', summary.without_scholarship], ['SUSPENDED', 'Suspendidos', summary.suspended_scholarships],
    ['EXPIRED', 'Vencidos', summary.expired_scholarships], ['CENTRAL', 'En base central', summary.central_matched],
  ] : [], [summary]);

  return <section className="roster-manager card">
    <header className="roster-heading"><div><p className="eyebrow">Control comparativo por grupo</p><h2>Padrones, registro y becas</h2><p>Conserva el listado fuente, compáralo con las cuentas reales y ejecuta cambios grupales con historial.</p></div><select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Selecciona un grupo</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.nombre}{Number(group.padron_total) ? ` · ${group.padron_registrados}/${group.padron_total} registrados` : ''}</option>)}</select></header>
    {error && <div className="alert alert--error">{error}</div>}{notice && <div className="source-note">{notice}</div>}
    {!groupId && <EmptyState title="Selecciona un grupo" description="El padrón se guarda dentro del grupo elegido para evitar mezclar instituciones o convenios." />}
    {groupId && <div className="roster-upload-panel">
      <FileSpreadsheet /><div><strong>Cargar Excel o CSV como nuevo padrón vigente</strong><small>RFC es el identificador principal; correo y código de beca se utilizan como respaldo.</small></div>
      <label className="button"><Upload /> {busy ? 'Leyendo…' : 'Elegir archivo'}<input type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={(event) => chooseFile(event.target.files?.[0] || null)} /></label>
    </div>}
    {parsed && <div className="roster-import-config">
      <div><strong>{parsed.fileName}</strong><small>{parsed.rows.length} filas · columnas: {Object.entries(parsed.headers).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' · ')}</small></div>
      {sheets.length > 1 && <label>Hoja<select value={sheet} onChange={(event) => changeSheet(event.target.value)}>{sheets.map((name) => <option key={name}>{name}</option>)}</select></label>}
      <div className="source-note">La carga solo conserva el padrón y realiza comparaciones. No crea códigos, membresías ni grupos docentes.</div>
      <Button onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar padrón y comparar'}</Button>
    </div>}
    {busy && groupId && !parsed && !roster && <Loader label="Consultando padrón del grupo" />}
    {groupId && !busy && !roster && !parsed && <EmptyState title="Este grupo todavía no tiene padrón" description="Carga el archivo correspondiente; después podrás distinguir registrados, pendientes y no registrados." />}
    {summary && <>
      <div className="roster-summary"><button type="button" className={!filter ? 'selected' : ''} onClick={() => { setFilter(''); loadRoster(groupId, '', search); }}><strong>{summary.total}</strong><span>Total del padrón</span></button>{metrics.map(([key, label, total]) => <button type="button" className={filter === key ? 'selected' : ''} key={key} onClick={() => { setFilter(key); loadRoster(groupId, key, search); }}><strong>{Number(total || 0)}</strong><span>{label}</span></button>)}</div>
      <div className="roster-meta"><div><strong>{summary.nombre_archivo}</strong><small>{summary.nombre_hoja || 'Hoja principal'} · cargado {formatDate(summary.creado_en)}</small></div><label>Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && loadRoster()} placeholder="Correo, código, nombre o RFC" /></label><Button variant="secondary" onClick={() => loadRoster()}><RefreshCw /> Aplicar</Button><Button variant="secondary" onClick={() => exportRows(roster.rows, summary.group_name)}><Download /> CSV</Button></div>
      <section className="roster-bulk-actions"><header><CalendarClock /><div><strong>Acciones sobre la beca del grupo</strong><small>No elimina cuentas ni filas del padrón. Actualiza la activación y la membresía histórica vinculada.</small></div></header><label>Nueva fecha<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><Button disabled={!endDate || busy} onClick={() => applyAction('SET_EXPIRY')}>Fijar vencimiento</Button><label>Ampliar días<input type="number" min="1" max="3650" value={days} onChange={(event) => setDays(event.target.value)} /></label><Button disabled={!days || busy} onClick={() => applyAction('EXTEND_DAYS')}>Ampliar vigencia</Button><Button variant="secondary" disabled={busy} onClick={() => applyAction('INDEFINITE')}>Acceso indefinido</Button><Button variant="secondary" disabled={busy} onClick={() => applyAction('REACTIVATE')}><RefreshCw /> Reactivar</Button><Button variant="danger" disabled={busy} onClick={() => applyAction('SUSPEND')}><ShieldOff /> Suspender beca</Button></section>
      <div className="roster-table"><table><thead><tr><th>Fila</th><th>Persona del padrón</th><th>Código</th><th>Base central</th><th>Registro</th><th>Beca</th><th>Vencimiento</th></tr></thead><tbody>{roster.rows.map((row) => <tr key={row.id}><td>{row.numero_fila}</td><td><strong>{row.name || row.account_name || row.username || 'Sin nombre'}</strong><small>{row.correo || 'Sin correo'}{row.rfc ? ` · ${row.rfc}` : ''}</small></td><td className="code-mono">{row.codigo || '—'}<small>{row.code_id ? 'Relacionado' : 'No existe en códigos'}</small></td><td><Badge tone={Number(row.central_match) ? 'green' : 'red'}>{Number(row.central_match) ? 'Coincide' : 'No localizado'}</Badge></td><td><Badge tone={tone(row.registration_status)}>{labels[row.registration_status]}</Badge>{row.account_status && <small>Cuenta {row.account_status}</small>}</td><td><Badge tone={tone(row.scholarship_status)}>{labels[row.scholarship_status]}</Badge><small>{row.membership_name || ''}</small></td><td>{formatDate(row.scholarship_expires)}</td></tr>)}</tbody></table>{!roster.rows.length && <EmptyState title="Sin resultados" description="Cambia el filtro o la búsqueda para volver a consultar el padrón." />}{roster.truncated && <p className="source-note">Vista limitada a 2,000 filas. Usa los filtros o descarga el CSV del conjunto visible.</p>}</div>
      <details className="roster-history"><summary><History /> Historial de cargas y acciones</summary><div className="roster-history-grid"><section><h3>Importaciones</h3>{history?.imports?.map((item) => <article key={item.id}><strong>{item.nombre_archivo}</strong><span>{item.total_filas} filas · {formatDate(item.creado_en)}</span>{item.es_vigente ? <Badge tone="green">Vigente</Badge> : <Button variant="secondary" disabled={busy} onClick={() => restoreImport(item.id)}>Restaurar</Button>}</article>)}</section><section><h3>Acciones</h3>{history?.actions?.map((item) => <article key={item.id}><strong>{item.accion}</strong><span>{item.afectados} afectados · {formatDate(item.creado_en)}</span></article>)}</section></div></details>
    </>}
  </section>;
}
