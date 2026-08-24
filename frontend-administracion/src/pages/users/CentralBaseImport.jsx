import { useEffect, useState } from 'react';
import { Database, Upload } from 'lucide-react';
import { Button } from '@/components/common';
import { userDashboardService } from '@/services/userDashboardService';
import { parseRosterFile } from './rosterFile';

export default function CentralBaseImport({ onImported }) {
  const [parsed, setParsed] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = () => userDashboardService.centralBaseHistory().then(setHistory).catch((e) => setError(e.message));
  useEffect(load, []);
  const choose = async (file) => {
    if (!file) return;
    setBusy(true); setError(''); setNotice('');
    try { setParsed(await parseRosterFile(file)); } catch (e) { setParsed(null); setError(e.message); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!parsed || !window.confirm(`¿Usar ${parsed.fileName} como nueva base central de comparación?`)) return;
    setBusy(true); setError('');
    try {
      const result = await userDashboardService.importCentralBase(parsed);
      setNotice(`Base central actualizada con ${result.total} filas. Este archivo no creó ningún grupo.`);
      setParsed(null); await load(); await onImported?.();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const current = history.find((item) => Number(item.current));
  return <section className="card roster-manager">
    <header className="roster-heading"><div><p className="eyebrow">Referencia general</p><h2><Database /> Base comparativa final.xlsx</h2><p>Se usa únicamente para cruces y análisis. No crea grupos ni registra usuarios.</p></div></header>
    {error && <div className="alert alert--error">{error}</div>}{notice && <div className="source-note">{notice}</div>}
    <div className="roster-upload-panel"><Database /><div><strong>{current ? current.file_name : 'Todavía no hay base central cargada'}</strong><small>{current ? `${current.total} filas · ${current.sheet_name || 'hoja principal'}` : 'Carga aquí solamente el archivo final.xlsx.'}</small></div>
      <label className="button"><Upload /> {busy ? 'Leyendo…' : 'Elegir final.xlsx'}<input type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={(e) => choose(e.target.files?.[0])} /></label>
    </div>
    {parsed && <div className="source-note"><strong>{parsed.fileName}</strong> · {parsed.rows.length} filas reconocidas · hoja {parsed.sheetName}<Button disabled={busy} onClick={save}>Guardar como base central</Button></div>}
    {history.length > 1 && <details><summary>Historial de bases cargadas ({history.length})</summary><ul>{history.map((item) => <li key={item.id}>{item.current ? 'Vigente · ' : ''}{item.file_name} · {item.total} filas</li>)}</ul></details>}
  </section>;
}
