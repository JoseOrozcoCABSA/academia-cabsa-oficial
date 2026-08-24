import { useCallback, useMemo, useState } from 'react';
import { ArrowRight, Edit3, ImagePlus, Newspaper, Plus, RefreshCw, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { contentService } from '@/services/contentService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, EmptyState, Input, Loader, Modal, Select, Textarea } from '@/components/common';
import MediaPicker from '@/components/media/MediaPicker';
import { mediaService } from '@/services/mediaService';
import './capsule-editor.css';

const emptyEntry = { title: '', slug: '', summary: '', category: 'BLOG', image: '', image_position: 'bottom', status: 'draft', is_featured: false };
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function BlogEntriesPage() {
  const navigate = useNavigate();
  const loader = useCallback(() => contentService.list('capsules', '?category=BLOG&limit=100&orderBy=updated_at&orderDirection=DESC'), []);
  const { items, loading, error, reload } = useRemoteList(loader, []);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyEntry);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [coverAsset, setCoverAsset] = useState(null);
  const entries = useMemo(() => items.filter((item) => !search || `${item.title} ${item.summary}`.toLowerCase().includes(search.toLowerCase())), [items, search]);

  const create = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.summary.trim()) return setNotice('Título, slug y resumen son obligatorios.');
    setSaving(true); setNotice('');
    try {
      const duplicate = await contentService.list('capsules', `?slug=${encodeURIComponent(form.slug)}&limit=1`);
      if (duplicate.length) throw new Error('Ese slug ya está utilizado.');
      const created = await contentService.create('capsules', { ...form, category: 'BLOG', body: '', published_at: form.status === 'published' ? new Date().toISOString() : null });
      if (coverAsset) {
        await mediaService.link(coverAsset.id, {
          entity_type: 'CAPSULE', entity_id: created.id, usage_type: 'COVER',
        }).catch(() => undefined);
      }
      setOpen(false); setForm(emptyEntry); await reload(); navigate(`/contenido/blog/${created.id}/editar`);
    } catch (requestError) { setNotice(requestError.message); }
    finally { setSaving(false); }
  };

  return <div className="page admin-page capsules-admin">
    <div className="page-heading"><div><p className="eyebrow">Novedades del portal</p><h1>Entradas del blog</h1><p>Crea noticias, comunicados y novedades con imagen de portada para el inicio de Academia CABSA.</p></div><Button onClick={() => { setForm(emptyEntry); setCoverAsset(null); setNotice(''); setOpen(true); }}><Plus /> Nueva entrada</Button></div>
    <div className="capsule-toolbar"><label className="search search--page"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar entrada" /></label><button className="icon-button refresh" onClick={reload} aria-label="Actualizar"><RefreshCw /></button><span>{entries.length} entradas</span></div>
    {error && <div className="alert alert--error">{error}</div>}{notice && <div className="alert alert--error">{notice}</div>}
    {loading ? <section className="card"><Loader label="Cargando entradas" /></section> : entries.length ? <section className="capsule-admin-grid">{entries.map((entry) => <article className="capsule-admin-card" key={entry.id}><div className="capsule-admin-cover">{entry.image ? <img src={entry.image} alt="" /> : <Newspaper />}<Badge tone={entry.status === 'published' ? 'green' : 'gold'}>{entry.status === 'published' ? 'Publicada' : 'Borrador'}</Badge></div><div className="capsule-admin-body"><small>Blog · {entry.published_at ? new Date(entry.published_at).toLocaleDateString('es-MX') : 'Sin publicar'}</small><h2>{entry.title}</h2><p>{entry.summary}</p><div className="capsule-admin-actions"><Link className="button button--primary" to={`/contenido/blog/${entry.id}/editar`}><Edit3 /> Editar entrada <ArrowRight /></Link></div></div></article>)}</section> : <section className="card"><EmptyState title="Aún no hay entradas" description="Crea la primera novedad para mostrarla en el inicio." action={<Button onClick={() => setOpen(true)}><Plus /> Nueva entrada</Button>} /></section>}
    <Modal open={open} title="Crear entrada del blog" onClose={() => !saving && setOpen(false)}><form className="resource-form" onSubmit={create}><Input label="Título *" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value, slug: slugify(event.target.value) })} /><Input label="Slug *" value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} /><Textarea label="Resumen *" rows="4" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /><Select label="Estado" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Borrador</option><option value="published">Publicada</option></Select><div className="blog-create-cover"><span>Imagen de portada</span><div className="capsule-editor-image">{form.image ? <img src={form.image} alt="Vista previa de portada" /> : <ImagePlus />}</div><Button type="button" variant="secondary" onClick={() => setMediaOpen(true)}><ImagePlus /> Subir o elegir imagen</Button></div><Select label="Posición de la imagen" value={form.image_position} onChange={(event) => setForm({ ...form, image_position: event.target.value })}><option value="bottom">Abajo del contenido</option><option value="top">Arriba del contenido</option></Select><Input label="URL de portada opcional" value={form.image} onChange={(event) => { setCoverAsset(null); setForm({ ...form, image: event.target.value }); }} /><div className="modal-actions"><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear y editar'}</Button></div></form></Modal>
    <MediaPicker open={mediaOpen} onClose={() => setMediaOpen(false)} title="Seleccionar portada de la entrada" onSelect={(asset) => { setCoverAsset(asset); setForm((current) => ({ ...current, image: asset.urls?.large || asset.urls?.original })); }} />
  </div>;
}
