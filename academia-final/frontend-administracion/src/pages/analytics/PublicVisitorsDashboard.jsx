/** @file Tablero agregado de navegación de visitantes todavía no identificados. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, MousePointerClick, ShieldCheck, UserRoundSearch } from 'lucide-react';
import { Card } from '@/components/common';
import { apiClient } from '@/services/apiClient';
import './trackers-dashboard.css';

const number = (value) => new Intl.NumberFormat('es-MX').format(Number(value || 0));
const dateTime = (value) => value
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

export default function PublicVisitorsDashboard() {
  const [data, setData] = useState({ totals: {}, sections: [], actions: [], devices: [] });
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient('/api/analytics/dashboard/public-visitors')
      .then((result) => setData(result || {}))
      .catch((requestError) => setError(requestError.message));
  }, []);
  const totals = data.totals || {};

  return <div className="page admin-page tracker-page">
    <section className="module-shell-hero tracker-heading">
      <div><p className="eyebrow">Analítica pública · últimos 30 días</p><h1>Visitantes sin cuenta</h1><p>Sesiones anónimas, páginas consultadas y acciones de interés antes de iniciar sesión o registrarse.</p></div>
      <Link className="button button--secondary" to="/analitica"><ArrowLeft /> Volver</Link>
    </section>
    {error && <div className="alert alert--error">{error}</div>}
    <aside className="tracker-insight tracker-insight--positive"><ShieldCheck /><div><strong>Privacidad desde el diseño</strong><p>No se muestran direcciones IP ni identificadores individuales. Una “visita” es una sesión técnica aproximada y no equivale necesariamente a una persona.</p></div></aside>
    <section className="tracker-metrics">
      <Card className="tracker-metric"><span className="metric-icon blue"><UserRoundSearch /></span><div><small>Sesiones visitantes</small><strong>{number(totals.visitors)}</strong><p>Navegadores sin cuenta identificada</p></div></Card>
      <Card className="tracker-metric"><span className="metric-icon green"><Eye /></span><div><small>Vistas válidas</small><strong>{number(totals.views)}</strong><p>Repeticiones deduplicadas</p></div></Card>
      <Card className="tracker-metric"><span className="metric-icon gold"><MousePointerClick /></span><div><small>Clics válidos</small><strong>{number(totals.clicks)}</strong><p>Acciones limitadas por sesión e IP</p></div></Card>
      <Card className="tracker-metric"><span className="metric-icon red"><UserRoundSearch /></span><div><small>Señales de interés</small><strong>{number(totals.interested_visitors)}</strong><p>Registro, becas, cursos, soporte o acceso</p></div></Card>
    </section>
    <div className="tracker-two-columns">
      <Card className="tracker-panel"><header><div><h2>Secciones consultadas</h2><p>Alcance anónimo agregado, sin mezclar alumnos autenticados.</p></div></header><div className="tracker-table-wrap"><table><thead><tr><th>Sección</th><th>Visitantes</th><th>Vistas</th><th>Clics</th><th>Última actividad</th></tr></thead><tbody>{(data.sections || []).map((item) => <tr key={item.section}><td><strong>{item.section}</strong></td><td>{number(item.visitors)}</td><td>{number(item.views)}</td><td>{number(item.clicks)}</td><td>{dateTime(item.last_activity)}</td></tr>)}</tbody></table>{!data.sections?.length && <p>Sin navegación pública registrada.</p>}</div></Card>
      <Card className="tracker-panel"><header><div><h2>Dispositivos</h2><p>Sesiones aproximadas por tamaño de pantalla.</p></div></header><div className="tracker-breakdown">{(data.devices || []).map((item) => <div key={item.device}><span>{item.device || 'desconocido'}</span><i><b style={{ width: `${Math.min(100, Number(item.visitors || 0) / Math.max(1, Number(totals.visitors || 0)) * 100)}%` }} /></i><strong>{number(item.visitors)}</strong></div>)}</div></Card>
    </div>
    <Card className="tracker-panel"><header><div><h2>Acciones más frecuentes</h2><p>Etiquetas sanitizadas de botones y enlaces; no se guardan correos ni números largos.</p></div></header><div className="tracker-table-wrap"><table><thead><tr><th>Acción</th><th>Sección</th><th>Clics</th><th>Visitantes</th></tr></thead><tbody>{(data.actions || []).map((item) => <tr key={`${item.section}-${item.action}`}><td><strong>{item.action}</strong></td><td>{item.section}</td><td>{number(item.clicks)}</td><td>{number(item.visitors)}</td></tr>)}</tbody></table>{!data.actions?.length && <p>Sin clics públicos registrados.</p>}</div></Card>
  </div>;
}
