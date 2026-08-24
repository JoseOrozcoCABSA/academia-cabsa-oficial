import { useCallback, useMemo, useState } from 'react';
import { ArrowRight, CopyPlus, Edit3, Library, Plus, RefreshCw, Search, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { contentService } from '@/services/contentService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, EmptyState, Input, Loader, Modal, Select, Textarea } from '@/components/common';
import './capsule-editor.css';

const emptyCapsule = {
  title: '',
  slug: '',
  summary: '',
  category: 'Cápsulas Educativas',
  image: '',
  external_url: '',
  is_featured: false,
  status: 'draft',
};

const slugify = (value) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function CapsulesPage() {
  const navigate = useNavigate();
  const loader = useCallback(
    () => contentService.list('capsules', '?limit=100&orderBy=updated_at&orderDirection=DESC'),
    [],
  );
  const { items, loading, error, reload } = useRemoteList(loader, []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyCapsule);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const capsules = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((capsule) => {
      if (String(capsule.category || '').toUpperCase() === 'BLOG') return false;
      const matchesStatus = !status || capsule.status === status;
      const matchesTerm = !term || [capsule.title, capsule.slug, capsule.summary, capsule.category]
        .some((value) => String(value || '').toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
  }, [items, search, status]);

  const changeTitle = (title) => setForm((current) => ({
    ...current,
    title,
    slug: current.slug && current.slug !== slugify(current.title) ? current.slug : slugify(title),
  }));

  const createCapsule = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.summary.trim() || !form.category.trim()) {
      setNotice('Título, slug, resumen y categoría son obligatorios.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const duplicate = await contentService.list('capsules', `?slug=${encodeURIComponent(form.slug)}&limit=2`);
      if (duplicate.length) throw new Error('Ese slug ya pertenece a otra cápsula.');
      const created = await contentService.create('capsules', {
        ...form,
        body: '',
        published_at: form.status === 'published' ? new Date().toISOString() : null,
      });
      setModalOpen(false);
      setForm(emptyCapsule);
      await reload();
      navigate(`/contenido/capsulas/${created.id}/editar`);
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const duplicateCapsule = async (capsule) => {
    setNotice('');
    try {
      const created = await contentService.create('capsules', {
        slug: `${capsule.slug}-copia-${Date.now().toString().slice(-5)}`,
        title: `${capsule.title} (copia)`,
        summary: capsule.summary,
        body: capsule.body,
        category: capsule.category,
        image: capsule.image,
        external_url: capsule.external_url,
        is_featured: false,
        status: 'draft',
        published_at: null,
      });
      await reload();
      navigate(`/contenido/capsulas/${created.id}/editar`);
    } catch (requestError) {
      setNotice(requestError.message);
    }
  };

  return <div className="page admin-page capsules-admin">
    <div className="page-heading">
      <div>
        <p className="eyebrow">Administración de contenido</p>
        <h1>Edición integral de cápsulas</h1>
        <p>Controla contenido, HTML, portada, publicación, semáforo y vista previa.</p>
      </div>
      <Button onClick={() => { setNotice(''); setForm(emptyCapsule); setModalOpen(true); }}><Plus /> Crear cápsula</Button>
    </div>

    <div className="capsule-toolbar">
      <label className="search search--page"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cápsula o categoría" /></label>
      <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estado">
        <option value="">Todos los estados</option>
        <option value="published">Publicadas</option>
        <option value="draft">Borradores</option>
        <option value="archived">Archivadas</option>
      </select>
      <button className="icon-button refresh" onClick={reload} aria-label="Actualizar"><RefreshCw /></button>
      <span>{capsules.length} cápsulas</span>
    </div>
    {error && <div className="alert alert--error">{error}</div>}
    {notice && <div className="alert alert--error">{notice}</div>}

    {loading ? <section className="card"><Loader label="Cargando cápsulas" /></section> : capsules.length
      ? <section className="capsule-admin-grid">{capsules.map((capsule) => <article className="capsule-admin-card" key={capsule.id}>
        <div className="capsule-admin-cover">
          {capsule.image ? <img src={capsule.image} alt="" /> : <Library />}
          <Badge tone={capsule.status === 'published' ? 'green' : capsule.status === 'draft' ? 'gold' : 'neutral'}>
            {capsule.status === 'published' ? 'Publicada' : capsule.status === 'draft' ? 'Borrador' : 'Archivada'}
          </Badge>
          {capsule.is_featured && <span className="capsule-featured"><Star /> Destacada</span>}
        </div>
        <div className="capsule-admin-body">
          <small>{capsule.category}</small>
          <h2>{capsule.title}</h2>
          <p>{capsule.summary}</p>
          <code>/{capsule.slug}</code>
          <div className="capsule-admin-actions">
            <Link className="button button--primary" to={`/contenido/capsulas/${capsule.id}/editar`}><Edit3 /> Editar todo <ArrowRight /></Link>
            <Button variant="secondary" onClick={() => duplicateCapsule(capsule)}><CopyPlus /> Duplicar</Button>
          </div>
        </div>
      </article>)}</section>
      : <section className="card"><EmptyState title="No hay cápsulas con estos criterios" description="Cambia los filtros o crea una nueva cápsula." action={<Button onClick={() => setModalOpen(true)}><Plus /> Crear cápsula</Button>} /></section>}

    <Modal open={modalOpen} title="Crear una cápsula" onClose={() => !saving && setModalOpen(false)}>
      <form className="resource-form" onSubmit={createCapsule}>
        <Input label="Título *" value={form.title} onChange={(event) => changeTitle(event.target.value)} />
        <Input label="Slug *" value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} />
        <Textarea label="Resumen *" rows="3" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
        <div className="form-grid">
          <Input label="Categoría *" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <Select label="Estado" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="draft">Borrador</option>
            <option value="published">Publicada</option>
            <option value="archived">Archivada</option>
          </Select>
        </div>
        <Input label="URL de portada" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} />
        <label className="check-field"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /><span>Mostrar como cápsula destacada</span></label>
        {notice && <div className="alert alert--error">{notice}</div>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear y editar contenido'}</Button>
        </div>
      </form>
    </Modal>
  </div>;
}
