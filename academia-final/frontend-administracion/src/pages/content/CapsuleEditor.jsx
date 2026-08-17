import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Code2, Eye, ExternalLink, FileText, Save, Sparkles, TrafficCone } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { contentService } from '@/services/contentService';
import { Badge, Button, Input, Loader, Select, Textarea } from '@/components/common';
import MediaPicker from '@/components/media/MediaPicker';
import { mediaService } from '@/services/mediaService';
import { PORTAL_URL } from '@/config/api';
import './capsule-editor.css';

const semaphoreDefaults = {
  GREEN: 'Comprendí bien el contenido de esta cápsula y puedo explicarlo con mis propias palabras.',
  YELLOW: 'Comprendí parte del contenido, pero necesito repasarlo para sentirme más seguro.',
  RED: 'Me costó comprender el contenido y necesito apoyo o una explicación adicional.',
};

const slugify = (value) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const splitSemaphore = (html = '') => {
  if (!html || typeof DOMParser === 'undefined') {
    return { body: html, enabled: false, options: semaphoreDefaults };
  }
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  const block = documentNode.body.querySelector('.semaforo');
  if (!block) return { body: html, enabled: false, options: semaphoreDefaults };
  const text = block.textContent || '';
  const extract = (emoji, next) => {
    const match = text.match(new RegExp(`${emoji}\\s*(.*?)(?=${next}|$)`, 'su'));
    return match?.[1]?.replace(/^(verde|amarillo|rojo)\\s*:\\s*/iu, '').trim();
  };
  const options = {
    GREEN: extract('🟢', '🟡|🔴') || semaphoreDefaults.GREEN,
    YELLOW: extract('🟡', '🟢|🔴') || semaphoreDefaults.YELLOW,
    RED: extract('🔴', '🟢|🟡') || semaphoreDefaults.RED,
  };
  block.remove();
  return { body: documentNode.body.innerHTML.trim(), enabled: true, options };
};

const buildSemaphore = (options) => `
<div class="semaforo">
  <h3>Semáforo de autoevaluación</h3>
  <p>🟢 ${options.GREEN}</p>
  <p>🟡 ${options.YELLOW}</p>
  <p>🔴 ${options.RED}</p>
</div>`.trim();

const previewDocument = (capsule, body, semaphore, blogMode) => {
  const cover = capsule.image ? `<img class="cover" src="${capsule.image}" alt="">` : '';
  const coverAtBottom = blogMode && capsule.image_position === 'bottom';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><style>
body{font-family:Inter,Arial,sans-serif;margin:0;color:#292b29;background:#fff}main{max-width:850px;margin:auto;padding:38px}
.eyebrow{color:#921a1d;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:12px}
h1{font-size:42px;line-height:1.08;margin:8px 0 18px;color:#501317}.lead{font-size:20px;color:#606660;line-height:1.6}
.cover{width:100%;max-height:420px;object-fit:cover;border-radius:15px;margin:18px 0 28px}.content{font-size:17px;line-height:1.75}.content img{max-width:100%}
.semaforo{margin-top:34px;padding:25px;border-radius:15px;background:#fbf6eb;border:1px solid #ead7a5}.semaforo h3{color:#72161a}
.option{display:block;margin:8px 0;padding:12px;border-radius:9px;background:#fff;border:1px solid #e3ddd1}
</style></head><body><main><p class="eyebrow">${capsule.category || 'Cápsulas educativas'}</p><h1>${capsule.title || 'Título de la cápsula'}</h1>
${coverAtBottom ? '' : cover}<p class="lead">${capsule.summary || ''}</p><div class="content">${body || '<p>Agrega contenido para visualizarlo aquí.</p>'}</div>
${coverAtBottom ? cover : ''}${semaphore.enabled ? `<section class="semaforo"><h3>Semáforo de aprendizaje</h3><span class="option">🟢 ${semaphore.options.GREEN}</span><span class="option">🟡 ${semaphore.options.YELLOW}</span><span class="option">🔴 ${semaphore.options.RED}</span></section>` : ''}</main></body></html>`;
};

const snippets = [
  ['Título', '<h2>Título de sección</h2>'],
  ['Párrafo', '<p>Escribe aquí el contenido de la cápsula.</p>'],
  ['Lista', '<ul>\\n  <li>Primer punto</li>\\n  <li>Segundo punto</li>\\n</ul>'],
  ['Reflexión', '<blockquote><strong>Reflexiona:</strong> Escribe aquí una pregunta para aplicar lo aprendido.</blockquote>'],
  ['Imagen', '<figure>\\n  <img src="https://..." alt="Descripción de la imagen">\\n  <figcaption>Pie de imagen</figcaption>\\n</figure>'],
  ['Video', '<iframe src="https://www.youtube.com/embed/..." title="Video" allowfullscreen></iframe>'],
];

export default function CapsuleEditor() {
  const { id } = useParams();
  const location = useLocation();
  const blogMode = location.pathname.startsWith('/contenido/blog/');
  const navigate = useNavigate();
  const bodyRef = useRef(null);
  const [capsule, setCapsule] = useState(null);
  const [form, setForm] = useState(null);
  const [body, setBody] = useState('');
  const [semaphore, setSemaphore] = useState({ enabled: true, options: semaphoreDefaults });
  const [tab, setTab] = useState('content');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [coverAsset, setCoverAsset] = useState(null);

  const load = async () => {
    setLoading(true);
    setNotice('');
    try {
      const current = await contentService.get('capsules', id);
      const separated = splitSemaphore(current.body || '');
      setCapsule(current);
      setForm(current);
      setBody(separated.body);
      setSemaphore({ enabled: blogMode ? false : separated.enabled || !current.body, options: separated.options });
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  const srcDoc = useMemo(() => form ? previewDocument(form, body, semaphore, blogMode) : '', [form, body, semaphore, blogMode]);

  const save = async (event) => {
    event?.preventDefault();
    if (!form.title?.trim() || !form.slug?.trim() || !form.summary?.trim() || !form.category?.trim()) {
      setNotice('Título, slug, resumen y categoría son obligatorios.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const duplicate = await contentService.list('capsules', `?slug=${encodeURIComponent(form.slug)}&limit=2`);
      if (duplicate.some((item) => String(item.id) !== String(id))) {
        throw new Error('Ese slug ya pertenece a otra cápsula.');
      }
      const completeBody = [body.trim(), !blogMode && semaphore.enabled ? buildSemaphore(semaphore.options) : ''].filter(Boolean).join('\n\n');
      const publishedAt = form.status === 'published' ? (form.published_at || new Date().toISOString()) : form.published_at;
      await contentService.update('capsules', id, {
        slug: form.slug,
        title: form.title,
        summary: form.summary,
        body: completeBody,
        category: blogMode ? 'BLOG' : form.category,
        image: form.image,
        image_position: form.image_position || 'top',
        external_url: form.external_url,
        is_featured: Boolean(form.is_featured),
        status: form.status,
        published_at: publishedAt,
      });
      if (coverAsset) {
        await mediaService.link(coverAsset.id, {
          entity_type: 'CAPSULE',
          entity_id: id,
          usage_type: 'COVER',
        });
      }
      setCapsule({ ...form, body: completeBody, published_at: publishedAt });
      setForm((current) => ({ ...current, published_at: publishedAt }));
      setSuccess(blogMode ? 'Entrada guardada correctamente.' : 'Cápsula guardada correctamente.');
      window.setTimeout(() => setSuccess(''), 2600);
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const insertSnippet = (snippet) => {
    const editor = bodyRef.current;
    if (!editor) {
      setBody((current) => `${current}\n${snippet}`.trim());
      return;
    }
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const next = `${body.slice(0, start)}${snippet}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const archive = async () => {
    setSaving(true);
    try {
      await contentService.update('capsules', id, { status: 'archived' });
      navigate(blogMode ? '/contenido/blog' : '/contenido/capsulas');
    } catch (requestError) {
      setNotice(requestError.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="page admin-page"><section className="card"><Loader label={blogMode ? 'Cargando editor de entrada' : 'Cargando editor de cápsula'} /></section></div>;
  if (!capsule || !form) return <div className="page admin-page"><div className="alert alert--error">{notice || (blogMode ? 'Entrada no encontrada.' : 'Cápsula no encontrada.')}</div><Link className="back-link" to={blogMode ? '/contenido/blog' : '/contenido/capsulas'}><ArrowLeft /> Volver</Link></div>;

  return <div className="page admin-page capsule-editor">
    <Link className="back-link" to={blogMode ? '/contenido/blog' : '/contenido/capsulas'}><ArrowLeft /> {blogMode ? 'Todas las entradas' : 'Todas las cápsulas'}</Link>
    <header className="capsule-editor-header">
      <div>
        <div className="capsule-editor-status"><Badge tone={form.status === 'published' ? 'green' : form.status === 'draft' ? 'gold' : 'neutral'}>{form.status}</Badge><span>ID {capsule.id}</span>{form.is_featured && <span><Sparkles /> Destacada</span>}</div>
        <h1>{form.title}</h1>
        <p>{blogMode ? 'Edita la novedad completa y comprueba cómo aparecerá en el inicio.' : 'Edita la experiencia completa y comprueba cómo aparecerá en la Mediateca.'}</p>
      </div>
      <div className="capsule-editor-actions">
        {form.status === 'published' && <a className="button button--secondary" href={blogMode ? `${PORTAL_URL}/novedades/${form.slug}` : `${PORTAL_URL}/mediateca/${form.slug}`} target="_blank" rel="noreferrer"><ExternalLink /> Ver publicada</a>}
        <Button onClick={save} disabled={saving}><Save /> {saving ? 'Guardando…' : blogMode ? 'Guardar entrada' : 'Guardar cápsula'}</Button>
      </div>
    </header>
    {notice && <div className="alert alert--error">{notice}</div>}
    {success && <div className="source-note capsule-editor-success"><Check /> {success}</div>}

    <nav className="capsule-editor-tabs">
      <button className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')}><FileText /> Contenido</button>
      {!blogMode && <button className={tab === 'semaphore' ? 'active' : ''} onClick={() => setTab('semaphore')}><TrafficCone /> Semáforo</button>}
      <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}><Eye /> Vista previa</button>
    </nav>

    {tab === 'content' && <form className="capsule-editor-layout" onSubmit={save}>
      <section className="card capsule-editor-main">
        <p className="eyebrow">Información pública</p>
        <Input label="Título *" value={form.title || ''} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <Input label="Slug *" value={form.slug || ''} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} />
        <Textarea label="Resumen *" rows="4" value={form.summary || ''} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
        <div className="capsule-code-heading"><div><span>Contenido HTML</span><small>El portal lo depura antes de mostrarlo.</small></div><Code2 /></div>
        <div className="capsule-snippet-bar">{snippets.map(([label, snippet]) => <button type="button" key={label} onClick={() => insertSnippet(snippet)}>+ {label}</button>)}</div>
        <textarea ref={bodyRef} className="capsule-html-editor" value={body} onChange={(event) => setBody(event.target.value)} rows="24" spellCheck="false" />
      </section>
      <aside className="capsule-editor-side">
        <section className="card">
          <p className="eyebrow">Publicación</p>
          <Select label="Estado" value={form.status || 'draft'} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="draft">Borrador</option><option value="published">Publicada</option><option value="archived">Archivada</option>
          </Select>
          <Input label="Categoría *" value={blogMode ? 'BLOG' : form.category || ''} disabled={blogMode} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <label className="check-field"><input type="checkbox" checked={Boolean(form.is_featured)} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /><span>{blogMode ? 'Destacar en Novedades' : 'Destacar en la Mediateca'}</span></label>
          <Button type="submit" className="capsule-editor-full" disabled={saving}><Save /> Guardar cambios</Button>
        </section>
        <section className="card">
          <p className="eyebrow">Imagen y enlace</p>
          <div className="capsule-editor-image">{form.image ? <img src={form.image} alt="Vista previa de portada" /> : <BookOpen />}</div>
          <Button variant="secondary" className="capsule-editor-full" onClick={() => setMediaOpen(true)}>Elegir de la biblioteca</Button>
          {blogMode && <Select label="Posición en la entrada" value={form.image_position || 'top'} onChange={(event) => setForm({ ...form, image_position: event.target.value })}><option value="bottom">Abajo del contenido</option><option value="top">Arriba del contenido</option></Select>}
          <Input label="URL de portada" value={form.image || ''} onChange={(event) => setForm({ ...form, image: event.target.value })} />
          <Input label="Enlace externo opcional" type="url" value={form.external_url || ''} onChange={(event) => setForm({ ...form, external_url: event.target.value })} />
        </section>
        <section className="card capsule-danger-zone"><h2>{blogMode ? 'Archivar entrada' : 'Archivar cápsula'}</h2><p>La retira del portal sin eliminar su contenido ni historial.</p><Button variant="danger" onClick={archive}>Archivar</Button></section>
      </aside>
    </form>}

    {tab === 'semaphore' && <div className="capsule-semaphore-layout">
      <section className="card">
        <div className="capsule-semaphore-heading"><div><p className="eyebrow">Autoevaluación</p><h2>Semáforo de aprendizaje</h2><p>Estos mensajes aparecerán en las opciones que selecciona el alumno.</p></div><label className="capsule-switch"><input type="checkbox" checked={semaphore.enabled} onChange={(event) => setSemaphore({ ...semaphore, enabled: event.target.checked })} /><span>{semaphore.enabled ? 'Activo' : 'Inactivo'}</span></label></div>
        <div className={`capsule-semaphore-fields${semaphore.enabled ? '' : ' disabled'}`}>
          <Textarea label="🟢 Verde — Comprensión lograda" rows="4" disabled={!semaphore.enabled} value={semaphore.options.GREEN} onChange={(event) => setSemaphore({ ...semaphore, options: { ...semaphore.options, GREEN: event.target.value } })} />
          <Textarea label="🟡 Amarillo — Requiere repaso" rows="4" disabled={!semaphore.enabled} value={semaphore.options.YELLOW} onChange={(event) => setSemaphore({ ...semaphore, options: { ...semaphore.options, YELLOW: event.target.value } })} />
          <Textarea label="🔴 Rojo — Requiere apoyo" rows="4" disabled={!semaphore.enabled} value={semaphore.options.RED} onChange={(event) => setSemaphore({ ...semaphore, options: { ...semaphore.options, RED: event.target.value } })} />
        </div>
        <div className="capsule-semaphore-save"><Button onClick={save} disabled={saving}><Save /> Guardar semáforo</Button></div>
      </section>
      <aside className="card"><p className="eyebrow">Compatibilidad</p><h2>Formato del portal</h2><p>Al guardar, el editor genera automáticamente el bloque <code>.semaforo</code> que utiliza la cápsula pública. No tienes que escribir emojis ni HTML manualmente.</p></aside>
    </div>}

    {tab === 'preview' && <section className="card capsule-preview-panel">
      <div className="capsule-preview-heading"><div><p className="eyebrow">Vista previa aislada</p><h2>{blogMode ? 'Así se verá la entrada' : 'Así se verá la cápsula'}</h2></div><Button variant="secondary" onClick={() => setTab('content')}><FileText /> Seguir editando</Button></div>
      <iframe title={blogMode ? 'Vista previa de la entrada' : 'Vista previa de cápsula'} sandbox="" srcDoc={srcDoc} />
    </section>}
    <MediaPicker
      open={mediaOpen}
      onClose={() => setMediaOpen(false)}
      title={blogMode ? 'Seleccionar portada de la entrada' : 'Seleccionar portada de la cápsula'}
      onSelect={(asset) => {
        setCoverAsset(asset);
        setForm((current) => ({ ...current, image: asset.urls?.large || asset.urls?.original }));
      }}
    />
  </div>;
}
