import { CalendarClock, CheckCircle2, KeyRound, ShieldX, Users } from 'lucide-react';

export const initialFilters = { search: '', email: '', level: '', status: '', batch: '', page: 1, limit: 50 };
export const initialImport = {
  text: '', defaultEmail: '', levelId: '8', starts: '', expires: '',
  maxUses: 1, batch: '', notes: '',
};
export const initialCreate = {
  emails: '', prefix: 'MEMB', levelId: '', starts: '', expires: '',
  maxUses: 1, batch: '', notes: '',
};
export const modes = [
  ['starts_with', 'Empieza con'], ['contains', 'Contiene'],
  ['ends_with', 'Termina con'], ['exact', 'Es igual a'],
];
export const statusLabel = {
  AVAILABLE: 'Disponible', USED: 'Utilizado', EXPIRED: 'Vencido',
  SCHEDULED: 'Programado', REVOKED: 'Revocado',
};
export const statusTone = {
  AVAILABLE: 'green', USED: 'gold', EXPIRED: 'red', SCHEDULED: 'blue', REVOKED: 'red',
};
export const date = (value) => value
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`))
  : 'Sin límite';
export const dateTime = (value) => value
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';
export const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(Number(value || 0));
export const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const normalizePrefix = (value) => String(value || 'MEMB').trim().toUpperCase()
  .replace(/[^A-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'MEMB';
export const randomToken = (length = 8) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join('');
};
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export const downloadCsv = (filename, rows) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys, ...rows.map((row) => keys.map((key) => row[key]))]
    .map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function Notice({ notice }) {
  if (!notice?.text) return null;
  return <div className={notice.error ? 'alert alert--error' : 'source-note'}>{notice.text}</div>;
}

export function OverviewCards({ stats = {} }) {
  return <section className="code-metrics">
    <div className="card"><KeyRound /><span><strong>{formatNumber(stats.total)}</strong><small>Códigos registrados</small></span></div>
    <div className="card"><CheckCircle2 /><span><strong>{formatNumber(stats.available)}</strong><small>Disponibles para activar</small></span></div>
    <div className="card"><Users /><span><strong>{formatNumber(stats.used)}</strong><small>Utilizados</small></span></div>
    <div className="card"><CalendarClock /><span><strong>{formatNumber(stats.expired)}</strong><small>Vencidos</small></span></div>
    <div className="card"><ShieldX /><span><strong>{formatNumber(stats.revoked)}</strong><small>Revocados</small></span></div>
  </section>;
}
