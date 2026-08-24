/** @file Resumen principal y accesos a los tableros especializados de analítica. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, Bot, CalendarDays, Flame, GraduationCap, Info,
  MousePointerClick, School, UserRoundCheck, Users,
} from 'lucide-react';
import { Card } from '@/components/common';
import { apiClient } from '@/services/apiClient';
import './trackers-dashboard.css';

const modules = [
  { to: '/analitica/visitantes', icon: Users, title: 'Visitantes sin cuenta', description: 'Analiza vistas, clics y señales de interés previas al registro, con privacidad y límites antiabuso.', question: '¿Qué interesa a posibles usuarios?' },
  { to: '/analitica/asistentes', icon: Bot, title: 'Asistentes y tutores', description: 'Consulta vistas, clics, conversión, sesiones, nivel educativo y proveedor de IA.', question: '¿Qué herramientas usan más?' },
  { to: '/analitica/capsulas', icon: Flame, title: 'Rachas y cápsulas', description: 'Revisa comprensión, constancia, días activos y cápsulas que necesitan refuerzo.', question: '¿Qué contenido requiere apoyo?' },
  { to: '/analitica/cursos', icon: GraduationCap, title: 'Cursos y lecciones', description: 'Compara alumnos activos, inscripciones, avance y porcentaje de finalización.', question: '¿Dónde avanza o abandona el alumno?' },
];

const formatted = (value) => new Intl.NumberFormat('es-MX').format(Number(value || 0));
export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState({ totals: {}, peopleByScholarship: {}, scholarshipProfiles: [], sectionClicks: [] });
  const [daily, setDaily] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([
      apiClient('/api/analytics/dashboard/summary'),
      apiClient('/api/analytics/reports/events'),
    ]).then(([summaryData, report]) => {
      setSummary({
        totals: summaryData?.totals || {},
        peopleByScholarship: summaryData?.peopleByScholarship || {},
        scholarshipProfiles: summaryData?.scholarshipProfiles || [],
        sectionClicks: summaryData?.sectionClicks || [],
      });
      setDaily(report?.daily || []);
    }).catch((requestError) => setError(requestError.message));
  }, []);
  const maximum = Math.max(...daily.map((item) => item.total), 1);
  const totalWeek = daily.reduce((total, item) => total + Number(item.total || 0), 0);
  const totals = summary.totals || {};
  const tones = ['blue', 'green', 'gold', 'red'];
  const icons = [School, UserRoundCheck, Users];

  return <div className="page admin-page module-shell">
    <section className="module-shell-hero">
      <div><p className="eyebrow">Centro de información</p><h1>Analítica de la plataforma</h1><p>Una vista dinámica por cada perfil de beca configurado en la plataforma.</p></div>
      <span>Histórico migrado + actividad actual</span>
    </section>
    {error && <div className="alert alert--error">{error}</div>}
    <aside className="tracker-insight tracker-insight--neutral">
      <Info /><div><strong>Perfiles de beca mostrados</strong><p>Este tablero separa las cuentas por su beca activa y agrega automáticamente los perfiles nuevos. Los perfiles de beneficio y acceso no deben confundirse con los roles administrativos. La actividad corresponde a los últimos 30 días.</p></div>
    </aside>
    <section className="admin-metrics">
      <Card><span className="metric-icon red"><Activity /></span><div><small>Interacciones de IA</small><strong>{totals.events == null ? '—' : formatted(totals.events)}</strong><p>Visitas, vistas y clics acumulados</p></div></Card>
      <Card><span className="metric-icon green"><Users /></span><div><small>Usuarios identificados</small><strong>{totals.activeUsers == null ? '—' : formatted(totals.activeUsers)}</strong><p>Cuentas reconocidas en actividad de IA</p></div></Card>
      <Card><span className="metric-icon gold"><Flame /></span><div><small>Registros de rachas</small><strong>{totals.streaks == null ? '—' : formatted(totals.streaks)}</strong><p>Historial de constancia disponible</p></div></Card>
      <Card><span className="metric-icon blue"><CalendarDays /></span><div><small>Días de actividad</small><strong>{totals.activeDays == null ? '—' : formatted(totals.activeDays)}</strong><p>Registros diarios acumulados</p></div></Card>
    </section>

    <div className="section-heading"><div><p className="eyebrow">Personas en la plataforma</p><h2>Uso por tipo de beca</h2><p>Beneficiarios con acceso vigente, inicios de sesión y navegación, separados sin mezclar los tres tipos de beca.</p></div></div>
    <section className="people-analytics-grid">
      {(summary.scholarshipProfiles || []).map((segment, index) => {
        const Icon = icons[index % icons.length];
        return <Card className="people-analytics-card" key={segment.levelId}><span className={`metric-icon ${tones[index % tones.length]}`}><Icon /></span><div><small>Tipo de beca: {segment.name}</small><strong>{formatted(segment.beneficiaries)}</strong><p>beneficiarios con beca activa</p><span className="people-analytics-description">Perfil #{segment.levelId} configurado en administración.</span><dl><div><dt>Iniciaron sesión</dt><dd>{formatted(segment.active30Days)}</dd></div><div><dt>Vieron la plataforma</dt><dd>{formatted(segment.viewers30Days)}</dd></div><div><dt>Interacciones</dt><dd>{formatted(segment.events30Days)}</dd></div></dl></div></Card>;
      })}
    </section>

    <Card className="section-usage-panel">
      <div className="card-heading"><div><h2>Clics y vistas por sección</h2><p>Actividad de navegación durante los últimos 30 días.</p></div><MousePointerClick /></div>
      {summary.sectionClicks.length ? <div className="tracker-table-wrap"><table><thead><tr><th>Sección</th><th>Vistas</th><th>Clics</th><th>Visitantes</th><th>Última actividad</th></tr></thead><tbody>{summary.sectionClicks.map((item) => <tr key={item.section}><td><strong>{item.section}</strong></td><td>{formatted(item.views)}</td><td>{formatted(item.clicks)}</td><td>{formatted(item.people)}</td><td>{item.last_activity ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.last_activity)) : '—'}</td></tr>)}</tbody></table></div> : <p>Aún no hay navegación registrada. Las cifras aparecerán conforme docentes y estudiantes usen el portal actualizado.</p>}
    </Card>

    <div className="section-heading"><div><p className="eyebrow">Análisis especializado</p><h2>¿Qué necesitas conocer?</h2></div></div>
    <section className="module-grid">{modules.map(({ to, icon: Icon, title, description, question }) => <Link className="module-card analytics-module-card" to={to} key={to}><span className="module-icon red"><Icon /></span><div><small>{question}</small><h3>{title}</h3><p>{description}</p><strong>Abrir tablero <ArrowRight /></strong></div></Link>)}</section>
    <div className="detail-grid">
      <Card><div className="card-heading"><div><h2>Interacciones de IA · últimos 7 días</h2><p>Total registrado: <strong>{formatted(totalWeek)}</strong></p></div><BarChart3 /></div><div className="bar-chart">{daily.map((item) => <div key={item.day} title={`${item.total} interacciones`}><b>{formatted(item.total)}</b><i style={{ height: `${item.total / maximum * 100}%` }} /><span>{new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${item.day}T00:00:00Z`))}</span></div>)}</div>{!daily.some((item) => item.total) && <p>Sin interacciones registradas en este periodo.</p>}</Card>
      <Card><h2>Contenido de los tableros</h2><p>Cada tablero incluye filtros, indicadores explicados, tendencias, rankings y detalle exportable.</p><ul className="clean-list"><li>Alcance y conversión de asistentes</li><li>Comprensión y apoyo en cápsulas</li><li>Rachas y constancia de alumnos</li><li>Avance y finalización de cursos</li></ul></Card>
    </div>
  </div>;
}
