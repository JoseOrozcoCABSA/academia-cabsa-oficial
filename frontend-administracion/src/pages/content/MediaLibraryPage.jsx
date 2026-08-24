import { useCallback, useMemo, useState } from 'react';
import { Archive, FileText, Film, Image as ImageIcon, Pencil, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { mediaService } from '@/services/mediaService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, ConfirmDialog, EmptyState, Input, Loader, Modal, Select, Textarea } from '@/components/common';
import './media-library.css';

const typeLabels = { IMAGE: 'Imagen', VIDEO: 'Video', DOCUMENT: 'Documento' };
const typeTitles = { IMAGE: 'Imágenes', VIDEO: 'Videos', DOCUMENT: 'Documentos' };
const formatBytes = (bytes) => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
};

export default function MediaLibraryPage({ initialType = '' }) {
  const [type, setType] = useState(initialType);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [remove, setRemove] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', alt_text: '', duration_seconds: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const loader = useCallback(
    () => mediaService.list(`?status=ACTIVE&limit=100${type ? `&type=${type}` : ''}`).then((result) => result.items || []),
    [type],
  );
  const { items, loading, error, reload } = useRemoteList(loader, []);

  const filtered = useMemo(() => items.filter((item) => (
    `${item.title} ${item.original_name} ${item.alt_text || ''}`.toLowerCase().includes(search.toLowerCase())
  )), [items, search]);

  const selectFile = (selected) => {
    setFile(selected);
    setForm((current) => ({
      ...current,
      title: current.title || selected.name.replace(/\.[^.]+$/, ''),
    }));
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file) { setNotice('Selecciona un archivo.'); return; }
    setSaving(true);
    setNotice('');
    try {
      await mediaService.upload(file, form);
      setUploadOpen(false);
      setFile(null);
      setForm({ title: '', alt_text: '', duration_seconds: '' });
      await reload();
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const update = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      await mediaService.update(editing.id, form);
      setEditing(null);
      await reload();
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (asset) => {
    setNotice('');
    try {
      await mediaService.update(asset.id, { status: 'ARCHIVED' });
      await reload();
    } catch (requestError) {
      setNotice(requestError.message);
    }
  };

  const removeAsset = async () => {
    const asset = remove;
    setRemove(null);
    try {
      await mediaService.remove(asset.id);
      await reload();
    } catch (requestError) {
      setNotice(requestError.message);
    }
  };

  const iconFor = (asset) => asset.type === 'VIDEO' ? <Film /> : asset.type === 'DOCUMENT' ? <FileText /> : <ImageIcon />;

  return <div className="page admin-page media-library">
    <div className="page-heading">
      <div><p className="eyebrow">content-service</p><h1>{initialType ? typeTitles[initialType] : 'Biblioteca multimedia'}</h1><p>Imágenes optimizadas, videos cortos y documentos reutilizables.</p></div>
      <Button onClick={() => { setNotice(''); setFile(null); setForm({ title: '', alt_text: '', duration_seconds: '' }); setUploadOpen(true); }}><Upload /> Subir archivo</Button>
    </div>
    <div className="media-library-toolbar">
      <label className="search search--page"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar archivo" /></label>
      <select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos los tipos</option><option value="IMAGE">Imágenes</option><option value="VIDEO">Videos</option><option value="DOCUMENT">Documentos</option></select>
      <button className="icon-button refresh" onClick={reload} aria-label="Actualizar"><RefreshCw /></button>
      <span>{filtered.length} archivos</span>
    </div>
    {error && <div className="alert alert--error">{error}</div>}
    {notice && <div className="alert alert--error">{notice}</div>}
    {loading ? <section className="card"><Loader label="Cargando biblioteca" /></section> : filtered.length ? <section className="media-asset-grid">{filtered.map((asset) => <article className="media-asset-card" key={asset.id}>
      <div className="media-asset-preview">
        {asset.type === 'IMAGE' ? <img src={asset.urls?.medium || asset.urls?.original} alt={asset.alt_text || asset.title} /> : iconFor(asset)}
        <Badge tone={asset.type === 'IMAGE' ? 'green' : asset.type === 'VIDEO' ? 'gold' : 'neutral'}>{typeLabels[asset.type]}</Badge>
      </div>
      <div className="media-asset-body">
        <h2>{asset.title}</h2><p>{asset.original_name}</p>
        <div className="media-asset-meta"><span>{formatBytes(asset.size_bytes)}</span>{asset.width && <span>{asset.width} × {asset.height}</span>}</div>
        {asset.alt_text && <small>Alt: {asset.alt_text}</small>}
        <div className="media-asset-actions">
          <button onClick={() => { setForm({ title: asset.title, alt_text: asset.alt_text || '', duration_seconds: asset.duration_seconds || '' }); setEditing(asset); }} title="Editar"><Pencil /></button>
          <a href={asset.urls?.original} target="_blank" rel="noreferrer" title="Abrir">{iconFor(asset)}</a>
          <button onClick={() => archive(asset)} title="Archivar"><Archive /></button>
          <button className="danger" onClick={() => setRemove(asset)} title="Eliminar"><Trash2 /></button>
        </div>
      </div>
    </article>)}</section> : <section className="card"><EmptyState title="La biblioteca está vacía" description="Sube la primera imagen, video corto o documento." action={<Button onClick={() => setUploadOpen(true)}><Plus /> Subir archivo</Button>} /></section>}

    <Modal open={uploadOpen} title="Subir archivo multimedia" onClose={() => !saving && setUploadOpen(false)}>
      <form onSubmit={upload} className="resource-form">
        <label className={`media-dropzone${file ? ' has-file' : ''}`}><Upload /><strong>{file ? file.name : 'Arrastra o selecciona un archivo'}</strong><span>Imágenes, MP4/WebM, PDF y documentos · máximo 25 MB</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(event) => selectFile(event.target.files?.[0] || null)} /></label>
        <Input label="Título" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <Textarea label="Texto alternativo (obligatorio para imágenes)" rows="3" value={form.alt_text} onChange={(event) => setForm({ ...form, alt_text: event.target.value })} />
        <Input label="Duración en segundos (video, opcional)" type="number" value={form.duration_seconds} onChange={(event) => setForm({ ...form, duration_seconds: event.target.value })} />
        {notice && <div className="alert alert--error">{notice}</div>}
        <div className="modal-actions"><Button variant="secondary" onClick={() => setUploadOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Procesando…' : 'Subir y procesar'}</Button></div>
      </form>
    </Modal>

    <Modal open={Boolean(editing)} title="Editar metadatos" onClose={() => !saving && setEditing(null)}>
      <form onSubmit={update} className="resource-form">
        <Input label="Título" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <Textarea label="Texto alternativo" rows="3" value={form.alt_text} onChange={(event) => setForm({ ...form, alt_text: event.target.value })} />
        {editing?.type === 'VIDEO' && <Input label="Duración en segundos" type="number" value={form.duration_seconds} onChange={(event) => setForm({ ...form, duration_seconds: event.target.value })} />}
        {notice && <div className="alert alert--error">{notice}</div>}
        <div className="modal-actions"><Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></div>
      </form>
    </Modal>
    <ConfirmDialog open={Boolean(remove)} title="Eliminar archivo definitivamente" message="Sólo se eliminará si ningún curso, lección o cápsula lo utiliza." onClose={() => setRemove(null)} onConfirm={removeAsset} />
  </div>;
}
