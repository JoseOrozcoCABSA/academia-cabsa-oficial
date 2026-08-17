import { useEffect, useMemo, useState } from 'react';
import { LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button, Loader } from '@/components/common';
import { userDashboardService } from '@/services/userDashboardService';
import { academiaService } from '@/services/academiaService';
import { contentService } from '@/services/contentService';
import { aiService } from '@/services/aiService';
import './access-control.css';

const typeNames = { course: 'Cursos', capsule: 'Cápsulas', forum: 'Foros', assistant_page: 'Asistentes', tutor_page: 'Tutores' };
const pretty = (value) => String(value).replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const enabled = (value) => Boolean(Number(value));

function Switch({ checked, busy, onChange }) {
  return <label className={`access-switch ${checked ? 'allowed' : 'blocked'}`}><input type="checkbox" checked={checked} disabled={busy} onChange={(event) => onChange(event.target.checked)} /><span><ShieldCheck />{checked ? 'Permitido' : 'Bloqueado'}</span></label>;
}

export default function AccessControlPage() {
  const [rows, setRows] = useState([]), [rules, setRules] = useState([]), [resources, setResources] = useState([]);
  const [type, setType] = useState('course'), [loading, setLoading] = useState(true), [saving, setSaving] = useState('');
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const sections = useMemo(() => rows.filter((row, index, all) => all.findIndex((item) => item.section_code === row.section_code) === index), [rows]);
  const levels = useMemo(() => [...new Set(rows.map((row) => Number(row.level_id)))], [rows]);
  const levelName = (level) => rows.find((row) => Number(row.level_id) === level)?.level_name || `Beca #${level}`;
  const load = () => {
    setLoading(true); setError('');
    return Promise.all([
      userDashboardService.accessMatrix(), userDashboardService.resourceAccessRules(),
      academiaService.list('courses', '?limit=500&orderBy=title&orderDirection=ASC'),
      contentService.list('capsules', '?limit=500&orderBy=title&orderDirection=ASC'),
      academiaService.list('forums', '?limit=500&orderBy=title&orderDirection=ASC'),
      aiService.list('data/ia_asistentes_tutores', '?limit=500&orderBy=slug&orderDirection=ASC'),
    ]).then(([matrix, resourceRules, courses, capsules, forums, links]) => {
      const pages = links.filter((row, index, all) => row.slug && all.findIndex((item) => item.slug === row.slug) === index);
      setRows(matrix); setRules(resourceRules); setResources([
        ...courses.map((item) => ({ type: 'course', key: String(item.id), title: item.title || item.name || item.slug, detail: item.category || item.slug })),
        ...capsules.filter((item) => String(item.category || '').toUpperCase() !== 'BLOG').map((item) => ({ type: 'capsule', key: String(item.id), title: item.title || item.slug, detail: item.category || item.slug })),
        ...forums.map((item) => ({ type: 'forum', key: String(item.id), title: item.title || item.name || item.slug, detail: item.slug })),
        ...pages.map((item) => ({ type: item.slug.startsWith('tutores-') ? 'tutor_page' : 'assistant_page', key: item.slug, title: pretty(item.slug), detail: 'Página completa de herramientas' })),
      ]);
    }).catch((cause) => setError(cause.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const toggleSection = async (level, section, allowed) => {
    const key = `section-${level}-${section}`; setSaving(key); setError(''); setMessage('');
    try { await userDashboardService.updateAccess(level, section, allowed); setRows((current) => current.map((row) => Number(row.level_id) === level && row.section_code === section ? { ...row, allowed: allowed ? 1 : 0 } : row)); setMessage('Permiso de página actualizado.'); }
    catch (cause) { setError(cause.message); } finally { setSaving(''); }
  };
  const toggleResource = async (level, item, allowed) => {
    const key = `resource-${level}-${item.type}-${item.key}`; setSaving(key); setError(''); setMessage('');
    try { await userDashboardService.updateResourceAccess(level, item.type, item.key, allowed); setRules((current) => [...current.filter((rule) => !(Number(rule.level_id) === level && rule.resource_type === item.type && String(rule.resource_key) === item.key)), { level_id: level, resource_type: item.type, resource_key: item.key, allowed: allowed ? 1 : 0 }]); setMessage(`${item.title}: permiso actualizado.`); }
    catch (cause) { setError(cause.message); } finally { setSaving(''); }
  };
  const visibleResources = resources.filter((item) => item.type === type);
  return <div className="page admin-page access-control-page"><div className="page-heading"><div><p className="eyebrow">Usuarios y acceso</p><h1>Acceso por tipo de beca</h1><p>Controla páginas, secciones y materiales para todos los perfiles de beca, incluidos los que agregues en el futuro.</p></div><Button variant="secondary" onClick={load}><RefreshCw /> Actualizar</Button></div>
    <section className="access-security-note"><LockKeyhole /><div><strong>La regla más restrictiva tiene prioridad</strong><p>Sin beca no hay acceso. Si una página está bloqueada, todos sus recursos quedan bloqueados. Si está permitida, puedes excluir recursos individuales.</p></div></section>{error && <div className="alert alert--error">{error}</div>}{message && <div className="source-note">{message}</div>}
    {loading ? <section className="card"><Loader label="Consultando páginas y contenidos" /></section> : <>
      <section className="card access-matrix-wrap"><header className="access-table-heading"><h2>1. Páginas completas</h2><p>Cursos, Lecciones, Mediateca, IA, Foros, Progreso y Soporte.</p></header><table className="access-matrix"><thead><tr><th>Sección</th>{levels.map((level) => <th key={level}>{levelName(level)}</th>)}</tr></thead><tbody>{sections.map((section) => <tr key={section.section_code}><td><strong>{section.section_name}</strong><small>{section.descripcion}</small><code>{section.section_code}</code></td>{levels.map((level) => { const rule = rows.find((row) => Number(row.level_id) === level && row.section_code === section.section_code); const key = `section-${level}-${section.section_code}`; return <td key={key}><Switch checked={enabled(rule?.allowed)} busy={saving === key} onChange={(allowed) => toggleSection(level, section.section_code, allowed)} /></td>; })}</tr>)}</tbody></table></section>
      <section className="card access-matrix-wrap resource-access"><header className="access-table-heading"><h2>2. Contenido individual</h2><p>Un curso bloqueado incluye todas sus lecciones; un foro bloqueado incluye sus temas y respuestas.</p><nav>{Object.entries(typeNames).map(([value, label]) => <button type="button" className={type === value ? 'active' : ''} onClick={() => setType(value)} key={value}>{label} <b>{resources.filter((item) => item.type === value).length}</b></button>)}</nav></header><table className="access-matrix"><thead><tr><th>{typeNames[type]}</th>{levels.map((level) => <th key={level}>{levelName(level)}</th>)}</tr></thead><tbody>{visibleResources.map((item) => <tr key={`${item.type}-${item.key}`}><td><strong>{item.title}</strong><small>{item.detail}</small><code>{item.key}</code></td>{levels.map((level) => { const rule = rules.find((candidate) => Number(candidate.level_id) === level && candidate.resource_type === item.type && String(candidate.resource_key) === item.key); const checked = rule ? enabled(rule.allowed) : true; const key = `resource-${level}-${item.type}-${item.key}`; return <td key={key}><Switch checked={checked} busy={saving === key} onChange={(allowed) => toggleResource(level, item, allowed)} /></td>; })}</tr>)}</tbody></table>{!visibleResources.length && <p className="access-empty">No hay recursos registrados de este tipo.</p>}</section>
    </>}
  </div>;
}
