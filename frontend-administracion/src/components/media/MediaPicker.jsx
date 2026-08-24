import { useEffect, useState } from 'react';
import { Check, Image as ImageIcon, Search, Upload } from 'lucide-react';
import { mediaService } from '@/services/mediaService';
import { Button, EmptyState, Loader, Modal } from '@/components/common';
import '@/pages/content/media-library.css';
import './media-picker.css';

export default function MediaPicker({ open, onClose, onSelect, title = 'Seleccionar imagen' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    setSelected(null);
    mediaService.list('?type=IMAGE&status=ACTIVE&limit=100')
      .then((result) => setItems(result.items || []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [open]);

  const uploadImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido.');
      return;
    }
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Imagen de portada';
    setUploading(true);
    setError('');
    try {
      const asset = await mediaService.upload(file, { title, alt_text: title });
      setItems((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setSelected(asset);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  };

  const filtered = items.filter((item) => (
    `${item.title} ${item.original_name} ${item.alt_text || ''}`.toLowerCase().includes(search.toLowerCase())
  ));

  return <Modal open={open} title={title} onClose={onClose}>
    <div className="media-picker">
      <label className={`media-picker-upload${uploading ? ' is-uploading' : ''}`}><Upload /><span><strong>{uploading ? 'Procesando imagen…' : 'Subir una imagen nueva'}</strong><small>JPG, PNG, WebP, GIF o AVIF · se optimizará automáticamente</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={uploading} onChange={(event) => { uploadImage(event.target.files?.[0]); event.target.value = ''; }} /></label>
      <label className="search search--page"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en la biblioteca" /></label>
      {error && <div className="alert alert--error">{error}</div>}
      {loading ? <Loader label="Cargando imágenes" /> : filtered.length ? <div className="media-picker-grid">{filtered.map((asset) => <button type="button" className={selected?.id === asset.id ? 'selected' : ''} key={asset.id} onClick={() => setSelected(asset)}>
        <img src={asset.urls?.small || asset.urls?.original} alt={asset.alt_text || asset.title} />
        <span>{asset.title}</span>
        {selected?.id === asset.id && <i><Check /></i>}
      </button>)}</div> : <EmptyState title="No hay imágenes" description="Primero sube una imagen desde la biblioteca multimedia." action={<ImageIcon />} />}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!selected || uploading} onClick={() => { onSelect(selected); onClose(); }}><Check /> Usar imagen</Button>
      </div>
    </div>
  </Modal>;
}
