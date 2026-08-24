import { useCallback, useMemo, useState } from 'react';
import { Bot, ExternalLink, GraduationCap, Link2, Pencil, RefreshCw, Search } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, EmptyState, Input, Loader, Modal } from '@/components/common';
import './assistant-links.css';

const groups = {
  'asistentes-preescolar': { type: 'assistant', level: 'preescolar', label: 'Asistentes · Preescolar', regular: 3 },
  'asistentes-primaria': { type: 'assistant', level: 'primaria', label: 'Asistentes · Primaria', regular: 6 },
  'asistentes-secundaria': { type: 'assistant', level: 'secundaria', label: 'Asistentes · Secundaria', regular: 3 },
  'tutores-preescolar': { type: 'tutor', level: 'preescolar', label: 'Tutores · Preescolar' },
  'tutores-primaria': { type: 'tutor', level: 'primaria', label: 'Tutores · Primaria' },
  'tutores-secundaria-alumnos': { type: 'tutor', level: 'secundaria', label: 'Tutores · Secundaria' },
};

const providerHosts = {
  gpt: new Set(['chatgpt.com', 'chat.openai.com']),
  gem: new Set(['gemini.google.com']),
};

const validateProviderUrl = (value, provider) => {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !providerHosts[provider].has(url.hostname.toLowerCase())) {
      return provider === 'gpt'
        ? 'Usa un enlace HTTPS de chatgpt.com.'
        : 'Usa un enlace HTTPS de gemini.google.com.';
    }
    return '';
  } catch {
    return 'El enlace no tiene un formato válido.';
  }
};

const rowTitle = (row) => {
  const group = groups[row.slug];
  const number = Number.parseInt(row.numero, 10);
  if (group?.regular && number > group.regular) return 'Asistente integrador';
  return `${group?.type === 'tutor' ? 'Tutor' : 'Asistente'} ${row.numero}`;
};

export default function AssistantLinksManager() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [level, setLevel] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ gpt_url: '', gem_url: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const loader = useCallback(
    () => aiService.list('data/ia_asistentes_tutores', '?limit=100&orderBy=slug&orderDirection=ASC'),
    [],
  );
  const { items, loading, error, reload } = useRemoteList(loader, []);

  const visible = useMemo(() => items.filter((row) => {
    const group = groups[row.slug];
    if (!group || (type && group.type !== type) || (level && group.level !== level)) return false;
    return `${group.label} ${rowTitle(row)} ${row.slug} ${row.numero}`
      .toLowerCase().includes(search.toLowerCase());
  }), [items, level, search, type]);

  const sections = useMemo(() => Object.entries(groups)
    .map(([slug, metadata]) => ({
      slug,
      ...metadata,
      rows: visible
        .filter((row) => row.slug === slug)
        .sort((left, right) => Number.parseInt(left.numero, 10) - Number.parseInt(right.numero, 10)),
    }))
    .filter((section) => section.rows.length), [visible]);

  const openEditor = (row) => {
    setNotice('');
    setErrors({});
    setForm({ gpt_url: row.gpt_url || '', gem_url: row.gem_url || '' });
    setEditing(row);
  };

  const save = async (event) => {
    event.preventDefault();
    const nextErrors = {
      gpt_url: validateProviderUrl(form.gpt_url, 'gpt'),
      gem_url: validateProviderUrl(form.gem_url, 'gem'),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSaving(true);
    setNotice('');
    try {
      await aiService.update('data/ia_asistentes_tutores', editing.id, {
        gpt_url: form.gpt_url.trim() || null,
        gem_url: form.gem_url.trim() || null,
      });
      setEditing(null);
      setNotice('Enlaces actualizados. El portal académico ya leerá esta configuración.');
      await reload();
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const configured = items.reduce(
    (total, row) => total + Number(Boolean(row.gpt_url)) + Number(Boolean(row.gem_url)),
    0,
  );

  return <div className="page admin-page assistant-links-page">
    <div className="page-heading">
      <div><p className="eyebrow">Catálogo conectado al portal académico</p><h1>Enlaces de asistentes y tutores</h1><p>Actualiza los accesos a ChatGPT y Gemini que aparecen para cada nivel educativo.</p></div>
      <Button variant="secondary" onClick={reload}><RefreshCw /> Actualizar</Button>
    </div>

    <section className="assistant-link-metrics">
      <div className="card"><Bot /><span><strong>{items.length}</strong><small>Herramientas registradas</small></span></div>
      <div className="card"><Link2 /><span><strong>{configured}</strong><small>Enlaces configurados</small></span></div>
      <div className="card"><GraduationCap /><span><strong>{Object.keys(groups).length}</strong><small>Tipo y nivel</small></span></div>
    </section>

    <div className="assistant-link-toolbar">
      <label className="search search--page"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar asistente o tutor" /></label>
      <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrar por tipo"><option value="">Asistentes y tutores</option><option value="assistant">Asistentes</option><option value="tutor">Tutores</option></select>
      <select value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Filtrar por nivel"><option value="">Todos los niveles</option><option value="preescolar">Preescolar</option><option value="primaria">Primaria</option><option value="secundaria">Secundaria</option></select>
    </div>

    {error && <div className="alert alert--error">{error}</div>}
    {notice && <div className={notice.startsWith('Enlaces') ? 'source-note' : 'alert alert--error'}>{notice}</div>}
    {loading ? <section className="card"><Loader label="Cargando enlaces" /></section> : sections.length
      ? <div className="assistant-link-sections">{sections.map((section) => <section key={section.slug}>
        <header><div><h2>{section.label}</h2><small>{section.rows.length} herramientas</small></div><Badge tone={section.type === 'assistant' ? 'gold' : 'green'}>{section.type === 'assistant' ? 'Asistentes' : 'Tutores'}</Badge></header>
        <div className="assistant-link-grid">{section.rows.map((row) => <article className="assistant-link-card" key={row.id}>
          <div className="assistant-link-card-title"><span>{row.numero}</span><div><h3>{rowTitle(row)}</h3><small>{row.slug}</small></div></div>
          <div className="provider-status">
            <span><Badge tone={row.gpt_url ? 'green' : 'neutral'}>GPT</Badge>{row.gpt_url ? 'Configurado' : 'Sin enlace'}</span>
            <span><Badge tone={row.gem_url ? 'green' : 'neutral'}>Gem</Badge>{row.gem_url ? 'Configurado' : 'Sin enlace'}</span>
          </div>
          <div className="assistant-link-actions">
            {row.gpt_url && <a href={row.gpt_url} target="_blank" rel="noreferrer">Probar GPT <ExternalLink /></a>}
            {row.gem_url && <a href={row.gem_url} target="_blank" rel="noreferrer">Probar Gem <ExternalLink /></a>}
            <button type="button" onClick={() => openEditor(row)}><Pencil /> Editar</button>
          </div>
        </article>)}</div>
      </section>)}</div>
      : <section className="card"><EmptyState title="No hay coincidencias" description="Cambia los filtros o la búsqueda." /></section>}

    <Modal open={Boolean(editing)} title={`Editar ${editing ? rowTitle(editing) : ''}`} onClose={() => !saving && setEditing(null)}>
      <form className="resource-form" onSubmit={save}>
        <div className="assistant-edit-context"><Badge tone="gold">{groups[editing?.slug]?.label || ''}</Badge><span>{editing?.slug} · posición {editing?.numero}</span></div>
        <Input label="Enlace de ChatGPT" type="url" placeholder="https://chatgpt.com/g/..." value={form.gpt_url} error={errors.gpt_url} onChange={(event) => setForm({ ...form, gpt_url: event.target.value })} />
        {form.gpt_url && !errors.gpt_url && <a className="provider-preview" href={form.gpt_url} target="_blank" rel="noreferrer">Abrir enlace de ChatGPT para comprobarlo <ExternalLink /></a>}
        <Input label="Enlace de Gemini Gem" type="url" placeholder="https://gemini.google.com/gem/..." value={form.gem_url} error={errors.gem_url} onChange={(event) => setForm({ ...form, gem_url: event.target.value })} />
        {form.gem_url && !errors.gem_url && <a className="provider-preview" href={form.gem_url} target="_blank" rel="noreferrer">Abrir enlace de Gemini para comprobarlo <ExternalLink /></a>}
        <p className="assistant-edit-help">Puedes dejar un campo vacío para ocultar ese botón en el portal. Los cambios se aplican sin recompilar el catálogo.</p>
        <div className="modal-actions"><Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar enlaces'}</Button></div>
      </form>
    </Modal>
  </div>;
}

