import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, CalendarDays, Info, Lightbulb, RefreshCw, Search } from 'lucide-react';
import { Button, Card, EmptyState, Loader } from '@/components/common';
import { trackersService } from '@/services/trackersService';
import { scholarshipCodesService } from '@/services/scholarshipCodesService';

const fallbackScholarships = [
  { id: 6, name: 'Docente' }, { id: 8, name: 'Familia estudiante' },
  { id: 11, name: 'Personal CABSA' },
];
let scholarshipProfilesPromise;
const useScholarshipProfiles = () => {
  const [profiles, setProfiles] = useState(fallbackScholarships);
  useEffect(() => {
    scholarshipProfilesPromise ||= scholarshipCodesService.profiles();
    scholarshipProfilesPromise.then(setProfiles).catch(() => {});
  }, []);
  return profiles;
};

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const value = new Date();
  value.setDate(value.getDate() - 29);
  return value.toISOString().slice(0, 10);
};
export const number = (value, decimals = 0) => new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: decimals,
}).format(Number(value || 0));
export const date = (value) => value
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`))
  : '—';
export const dateTime = (value) => value
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';
export const statusLabel = (value) => ({
  GREEN: 'Comprendido', YELLOW: 'Reforzar', RED: 'Necesita apoyo',
  COMPLETED: 'Completado', IN_PROGRESS: 'En progreso', NOT_STARTED: 'Sin iniciar',
  click: 'Clic', impression: 'Impresión', page_view: 'Visita',
}[value] || value || '—');
export const statusTone = (value) => ({
  GREEN: 'green', COMPLETED: 'green', click: 'green',
  YELLOW: 'gold', IN_PROGRESS: 'gold', impression: 'gold',
  RED: 'red',
}[value] || 'neutral');
export const percent = (part, total) => Number(total) ? Number(part || 0) / Number(total) * 100 : 0;

const csvCell = (value) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
export const exportCsv = (filename, rows) => {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const content = [columns, ...rows.map((row) => columns.map((column) => row[column]))]
    .map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function useTracker(kind, extra = {}) {
  const initial = useMemo(() => ({ from: monthAgo(), to: today(), ...extra }), [extra]);
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return trackersService[kind](filters)
      .then(setData)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [filters, kind]);
  useEffect(() => { load(); }, [load]);
  const apply = (event) => { event.preventDefault(); setFilters(draft); };
  const clear = () => {
    const next = { from: monthAgo(), to: today(), ...extra };
    setDraft(next);
    setFilters(next);
  };
  return { data, draft, setDraft, filters, loading, error, apply, clear, load };
}

export function TrackerNav() {
  return <nav className="tracker-nav" aria-label="Paneles de analítica">
    <NavLink to="/analitica/asistentes">Asistentes y tutores</NavLink>
    <NavLink to="/analitica/capsulas">Rachas y cápsulas</NavLink>
    <NavLink to="/analitica/cursos">Cursos y lecciones</NavLink>
  </nav>;
}

export function TrackerHeader({ eyebrow, title, description, onRefresh, actions }) {
  return <>
    <div className="page-heading tracker-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      <div className="tracker-heading-actions">{actions}<Button variant="secondary" onClick={onRefresh}><RefreshCw /> Actualizar</Button></div>
    </div>
    <TrackerNav />
  </>;
}

export function Filters({ draft, setDraft, onSubmit, onClear, children }) {
  const scholarships = useScholarshipProfiles();
  return <form className="tracker-filters card" onSubmit={onSubmit}>
    <div className="tracker-filter-intro"><strong>Periodo de análisis</strong><small>Las cifras y tablas se recalculan con estos filtros.</small></div>
    <label><span>Desde</span><input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} required /></label>
    <label><span>Hasta</span><input type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} required /></label>
    <label><span>Perfil de beca</span><select value={draft.scholarshipLevel || ''} onChange={(event) => setDraft({ ...draft, scholarshipLevel: event.target.value })}><option value="">Todos los perfiles</option>{scholarships.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select></label>
    {children}
    <div className="tracker-filter-actions"><Button type="submit">Aplicar filtros</Button><Button type="button" variant="secondary" onClick={onClear}>Restablecer</Button></div>
  </form>;
}

export function PeriodSummary({ period }) {
  if (!period?.from || !period?.to) return null;
  const days = Math.max(1, Math.round((new Date(period.to) - new Date(period.from)) / 86400000) + 1);
  return <div className="tracker-period"><CalendarDays /><span><strong>Datos mostrados:</strong> {date(period.from)} al {date(period.to)} · {days} días</span></div>;
}

export function Metrics({ items }) {
  return <section className="tracker-metrics">{items.map(({ label, value, hint, definition, icon: Icon, tone = 'red' }) => <Card key={label} className="tracker-metric">
    <span className={`metric-icon ${tone}`}><Icon /></span>
    <div><small>{label}</small><strong>{value}</strong><p>{hint}</p>{definition && <span className="metric-definition"><Info />{definition}</span>}</div>
  </Card>)}</section>;
}

export function Insight({ title = 'Lectura rápida', children, tone = 'neutral' }) {
  return <aside className={`tracker-insight tracker-insight--${tone}`}><Lightbulb /><div><strong>{title}</strong><p>{children}</p></div></aside>;
}

export function DailyChart({ rows, valueKey, label }) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  const total = rows.reduce((sum, row) => sum + Number(row[valueKey] || 0), 0);
  return <Card className="tracker-chart">
    <div className="card-heading"><div><h2>Actividad por día</h2><p>{label}. Total del periodo: <strong>{number(total)}</strong>.</p></div><BarChart3 /></div>
    {rows.length ? <div className="tracker-bars">{rows.map((row) => <div key={row.date}>
      <span className="tracker-bar-value">{number(row[valueKey])}</span>
      <i style={{ height: `${Math.max(4, Number(row[valueKey] || 0) / maximum * 100)}%` }} title={`${date(row.date)}: ${number(row[valueKey])}`} />
      <span>{new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${row.date}T00:00:00Z`))}</span>
    </div>)}</div> : <EmptyState title="Sin actividad diaria" description="No hubo movimientos en el periodo y filtros seleccionados." />}
  </Card>;
}

export function DataTable({ columns, rows, empty = 'No hay datos con estos filtros.' }) {
  if (!rows?.length) return <EmptyState title="Sin registros" description={empty} />;
  return <div className="tracker-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row.id || row.row_id || row.user_id || row.user_key || `${row.date}-${index}`}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody>
  </table></div>;
}

export function Panel({ title, description, action, children }) {
  return <Card className="tracker-panel"><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>{children}</Card>;
}

export function Breakdown({ items }) {
  const maximum = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  return <div className="tracker-breakdown">{items.map((item) => <div key={item.label}>
    <span>{item.label}</span><i><b style={{ width: `${Number(item.value || 0) / maximum * 100}%` }} /></i><strong>{number(item.value)}</strong>
  </div>)}</div>;
}

export function ScholarshipUsage({ rows = [], selected = '', interactionLabel = 'interacciones' }) {
  const scholarshipCatalog = useScholarshipProfiles();
  const visible = selected
    ? scholarshipCatalog.filter((item) => String(item.id) === String(selected))
    : scholarshipCatalog;
  const rowFor = (levelId) => rows.find((row) => Number(row.level_id) === levelId) || {};
  return <section className="scholarship-usage-section">
    <header><div><p className="eyebrow">Uso por rol de acceso</p><h2>Actividad por tipo de beca</h2><p>{selected ? 'Las métricas del tablero están filtradas al tipo seleccionado.' : 'Comparación de los tres tipos de beneficio vigentes, sin mezclar su actividad.'}</p></div></header>
    <div className="scholarship-usage-grid">{visible.map((item) => {
      const row = rowFor(item.id);
      return <Card className="scholarship-usage-card" key={item.id}><small>{item.name}</small><strong>{number(row.users)}</strong><span>usuarios únicos</span><dl><div><dt>{interactionLabel}</dt><dd>{number(row.interactions)}</dd></div>{row.clicks != null && <div><dt>Clics</dt><dd>{number(row.clicks)}</dd></div>}</dl><p>{item.description || `Perfil de beca #${item.id}`}</p></Card>;
    })}</div>
  </section>;
}

export function ErrorOrLoader({ error, loading, children }) {
  if (loading) return <Card><Loader label="Calculando métricas" /></Card>;
  return <>{error && <div className="alert alert--error">{error}</div>}{!error && children}</>;
}
