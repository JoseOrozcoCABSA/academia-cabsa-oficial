import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, Clock3, Edit3, Eye, FileQuestion, FileText, Layers3, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { academiaService } from '@/services/academiaService';
import { Badge, Button, ConfirmDialog, EmptyState, Input, Loader, Select, Textarea } from '@/components/common';
import MediaPicker from '@/components/media/MediaPicker';
import { mediaService } from '@/services/mediaService';
import LessonEditorModal from './LessonEditorModal';
import { emptyLesson, lessonDraft, lessonPayload, lessonType, slugify } from './courseEditorModel';
import './course-editor.css';
import './course-editor-types.css';

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState(null);
  const [form, setForm] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [tab, setTab] = useState(searchParams.get('tab') === 'structure' ? 'structure' : 'general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonEditing, setLessonEditing] = useState(null);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [removeLesson, setRemoveLesson] = useState(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [coverAsset, setCoverAsset] = useState(null);

  const load = async () => {
    setLoading(true);
    setNotice('');
    try {
      const [currentCourse, currentLessons] = await Promise.all([
        academiaService.get('courses', id),
        academiaService.list('lessons', `?course_id=${id}&limit=100&orderBy=number`),
      ]);
      setCourse(currentCourse);
      setForm(currentCourse);
      setLessons(currentLessons.sort((left, right) => Number(left.number) - Number(right.number)));
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const modules = useMemo(() => [...new Set(lessons.map((lesson) => lesson.module).filter(Boolean))], [lessons]);
  const moduleLessonCounts = useMemo(() => lessons.reduce((counts, lesson) => {
    const module = lesson.module || '';
    counts.set(module, (counts.get(module) || 0) + 1);
    return counts;
  }, new Map()), [lessons]);
  const showSuccess = (message) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(''), 2600);
  };

  const saveCourse = async (event) => {
    event.preventDefault();
    if (!form.title?.trim() || !form.slug?.trim() || !form.summary?.trim()) {
      setNotice('Título, slug y resumen son obligatorios.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const publishedAt = form.status === 'published'
        ? (form.published_at || new Date().toISOString())
        : form.published_at;
      await academiaService.update('courses', id, {
        slug: form.slug,
        title: form.title,
        summary: form.summary,
        description: form.description,
        image: form.image,
        category: form.category,
        status: form.status,
        published_at: publishedAt,
        lessons_count: lessons.length,
        reading_timer_enabled: Boolean(form.reading_timer_enabled),
      });
      if (coverAsset) {
        await mediaService.link(coverAsset.id, {
          entity_type: 'COURSE',
          entity_id: id,
          usage_type: 'COVER',
        });
      }
      setCourse({ ...form, published_at: publishedAt, lessons_count: lessons.length });
      setForm((current) => ({ ...current, published_at: publishedAt, lessons_count: lessons.length }));
      showSuccess('Curso guardado correctamente.');
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const openLesson = (lesson = null) => {
    setLessonEditing(lesson);
    setLessonForm(lessonDraft(lesson, modules.at(-1) || ''));
    setNotice('');
    setLessonOpen(true);
  };

  const changeLessonTitle = (title) => setLessonForm((current) => ({
    ...current,
    title,
    slug: current.slug && current.slug !== slugify(current.title) ? current.slug : slugify(title),
  }));

  const saveLesson = async (event) => {
    event.preventDefault();
    if (!lessonForm.title.trim()) {
      setNotice('El título de la lección es obligatorio.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const payload = lessonPayload(lessonForm);
      let savedLesson;
      if (lessonEditing) {
        await academiaService.update('lessons', lessonEditing.id, payload);
        savedLesson = { ...lessonEditing, ...payload };
      } else {
        savedLesson = await academiaService.create('lessons', {
          ...payload,
          course_id: Number(id),
          number: lessons.length + 1,
        });
      }
      const shouldConfigureExam = lessonForm.lesson_type === 'EXAM'
        && (!lessonEditing || lessonEditing.lesson_type !== 'EXAM');
      const nextCount = lessonEditing ? lessons.length : lessons.length + 1;
      await academiaService.update('courses', id, { lessons_count: nextCount });
      setLessonOpen(false);
      if (shouldConfigureExam && savedLesson?.id) {
        navigate(`/academia/cursos/${id}/lecciones/${savedLesson.id}/examen`);
        return;
      }
      await load();
      setTab('structure');
      showSuccess(lessonEditing ? 'Lección actualizada.' : 'Lección creada.');
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const persistOrder = async (ordered) => {
    setSaving(true);
    setNotice('');
    try {
      await Promise.all(ordered.map((lesson, index) => (
        academiaService.update('lessons', lesson.id, { number: index + 1 })
      )));
      setLessons(ordered.map((lesson, index) => ({ ...lesson, number: index + 1 })));
      showSuccess('Orden guardado.');
    } catch (requestError) {
      setNotice(requestError.message);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const moveLesson = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= lessons.length || saving) return;
    const ordered = [...lessons];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    persistOrder(ordered);
  };

  const confirmRemoveLesson = async () => {
    const lesson = removeLesson;
    setRemoveLesson(null);
    setSaving(true);
    setNotice('');
    try {
      await academiaService.remove('lessons', lesson.id);
      const remaining = lessons.filter((item) => item.id !== lesson.id);
      await Promise.all(remaining.map((item, index) => academiaService.update('lessons', item.id, { number: index + 1 })));
      await academiaService.update('courses', id, { lessons_count: remaining.length });
      await load();
      showSuccess('Lección eliminada.');
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const archiveCourse = async () => {
    setSaving(true);
    try {
      await academiaService.update('courses', id, { status: 'archived' });
      navigate('/academia/cursos');
    } catch (requestError) {
      setNotice(requestError.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="page admin-page"><section className="card"><Loader label="Cargando editor del curso" /></section></div>;
  if (!course || !form) return <div className="page admin-page"><div className="alert alert--error">{notice || 'Curso no encontrado.'}</div><Link className="back-link" to="/academia/cursos"><ArrowLeft /> Volver a cursos</Link></div>;

  return <div className="page admin-page course-editor">
    <Link className="back-link" to="/academia/cursos"><ArrowLeft /> Todos los cursos</Link>
    <header className="course-editor-header">
      <div>
        <div className="course-editor-status">
          <Badge tone={form.status === 'published' ? 'green' : form.status === 'draft' ? 'gold' : 'neutral'}>{form.status}</Badge>
          <span>ID {course.id}</span>
        </div>
        <h1>{form.title}</h1>
        <p>Modifica toda la experiencia del curso sin salir de esta pantalla.</p>
      </div>
      <div className="course-editor-header-actions">
        <Button variant="secondary" onClick={() => setTab('preview')}><Eye /> Vista previa</Button>
        <Button onClick={saveCourse} disabled={saving}><Save /> {saving ? 'Guardando…' : 'Guardar curso'}</Button>
      </div>
    </header>

    {notice && <div className="alert alert--error">{notice}</div>}
    {success && <div className="source-note course-editor-success"><Check /> {success}</div>}

    <nav className="course-editor-tabs" aria-label="Secciones del editor">
      <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}><FileText /> Información general</button>
      <button className={tab === 'structure' ? 'active' : ''} onClick={() => setTab('structure')}><Layers3 /> Estructura <span>{lessons.length}</span></button>
      <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}><Eye /> Vista previa</button>
    </nav>

    {tab === 'general' && <form onSubmit={saveCourse} className="course-editor-layout">
      <section className="card course-editor-main">
        <div className="card-heading"><div><p className="eyebrow">Ficha del curso</p><h2>Información pública</h2></div></div>
        <Input label="Título *" value={form.title || ''} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <Input label="Slug *" value={form.slug || ''} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} />
        <Textarea label="Resumen *" rows="4" value={form.summary || ''} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
        <Textarea label="Descripción completa" rows="12" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </section>
      <aside className="course-editor-side">
        <section className="card">
          <p className="eyebrow">Publicación</p>
          <Select label="Estado" value={form.status || 'draft'} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </Select>
          <Input label="Categoría" value={form.category || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <Button type="submit" className="course-editor-full" disabled={saving}><Save /> Guardar cambios</Button>
        </section>
        <section className="card course-timer-settings">
          <div className="course-timer-heading"><Clock3 /><div><p className="eyebrow">Cronómetro de lectura</p><h2>Controlar tiempo de estudio</h2></div></div>
          <p>Cuando está activo, el alumno debe iniciar el cronómetro y cumplir el tiempo mínimo de cada lección antes de completarla.</p>
          <div className="course-timer-toggle" role="group" aria-label="Activar cronómetro del curso">
            <button type="button" className={form.reading_timer_enabled ? 'active' : ''} onClick={() => setForm({ ...form, reading_timer_enabled: true })}>Sí, activar</button>
            <button type="button" className={!form.reading_timer_enabled ? 'active' : ''} onClick={() => setForm({ ...form, reading_timer_enabled: false })}>No, desactivar</button>
          </div>
          <small>Guarda el curso para aplicar esta configuración.</small>
        </section>
        <section className="card">
          <p className="eyebrow">Portada</p>
          <div className="course-editor-image">{form.image ? <img src={form.image} alt="Vista previa de portada" /> : <BookOpen />}</div>
          <Button variant="secondary" className="course-editor-full" onClick={() => setMediaOpen(true)}>Elegir de la biblioteca</Button>
          <Input label="URL de imagen" value={form.image || ''} onChange={(event) => setForm({ ...form, image: event.target.value })} />
        </section>
        <section className="card course-danger-zone">
          <h2>Archivar curso</h2>
          <p>Lo retira del catálogo activo sin eliminar sus lecciones ni información.</p>
          <Button variant="danger" onClick={archiveCourse} disabled={saving}>Archivar</Button>
        </section>
      </aside>
    </form>}

    {tab === 'structure' && <div className="course-structure-layout">
      <section className="card">
        <div className="course-structure-heading">
          <div><p className="eyebrow">Plan de aprendizaje</p><h2>Módulos y lecciones</h2><p>El orden se guarda inmediatamente. El nombre del módulo se administra dentro de cada lección.</p></div>
          <Button onClick={() => openLesson()}><Plus /> Nueva lección</Button>
        </div>
        {lessons.length ? <div className="course-lesson-editor-list">{lessons.map((lesson, index) => {
          const newModule = index === 0 || lessons[index - 1].module !== lesson.module;
          return <div key={lesson.id}>
            {newModule && <div className="course-module-heading"><Layers3 /><strong>{lesson.module || 'Lecciones sin módulo'}</strong><span>{moduleLessonCounts.get(lesson.module || '') || 0} lecciones</span></div>}
            <article className="course-lesson-row">
              <span className="course-lesson-number">{index + 1}</span>
              <div><div className="course-lesson-title"><h3>{lesson.title}</h3><Badge tone={lessonType(lesson.lesson_type).tone}>{lessonType(lesson.lesson_type).short}</Badge>{form.reading_timer_enabled && <Badge tone="neutral"><Clock3 /> {Math.max(1, Math.ceil(Number(lesson.minimum_reading_seconds || 300) / 60))} min</Badge>}</div><p>{lesson.summary || 'Sin resumen'}</p><small>/{lesson.slug || 'sin-slug'}</small></div>
              <div className="course-lesson-actions">
                <button type="button" onClick={() => moveLesson(index, -1)} disabled={index === 0 || saving} title="Subir"><ArrowUp /></button>
                <button type="button" onClick={() => moveLesson(index, 1)} disabled={index === lessons.length - 1 || saving} title="Bajar"><ArrowDown /></button>
                {lesson.lesson_type === 'EXAM' && <button type="button" className="exam exam-config" onClick={() => navigate(`/academia/cursos/${id}/lecciones/${lesson.id}/examen`)} title="Abrir editor de examen"><FileQuestion /><span>Configurar examen</span></button>}
                <button type="button" onClick={() => openLesson(lesson)} title="Editar"><Edit3 /></button>
                <button type="button" className="danger" onClick={() => setRemoveLesson(lesson)} title="Eliminar"><Trash2 /></button>
              </div>
            </article>
          </div>;
        })}</div> : <EmptyState title="Este curso aún no tiene lecciones" description="Crea la primera lección y asígnala a un módulo." action={<Button onClick={() => openLesson()}><Plus /> Crear primera lección</Button>} />}
      </section>
      <aside className="card course-structure-summary">
        <p className="eyebrow">Resumen</p>
        <div><strong>{modules.length}</strong><span>Módulos</span></div>
        <div><strong>{lessons.length}</strong><span>Lecciones</span></div>
        <div><strong>{lessons.filter((lesson) => lesson.content?.trim()).length}</strong><span>Con contenido</span></div>
        <div><strong>{lessons.filter((lesson) => lesson.lesson_type === 'EXAM').length}</strong><span>Exámenes</span></div>
      </aside>
    </div>}

    {tab === 'preview' && <section className="course-preview">
      <div className="course-preview-hero">
        {form.image ? <img src={form.image} alt="" /> : <div className="course-preview-placeholder"><BookOpen /></div>}
        <div><Badge tone={form.status === 'published' ? 'green' : 'gold'}>{form.status}</Badge><small>{form.category || 'Curso CABSA'}</small><h2>{form.title}</h2><p>{form.summary}</p></div>
      </div>
      <div className="course-preview-body">
        <article className="card"><h2>Acerca de este curso</h2><p>{form.description || 'Este curso aún no tiene una descripción completa.'}</p></article>
        <aside className="card"><h2>Contenido</h2>{lessons.map((lesson, index) => <div className="course-preview-lesson" key={lesson.id}><span>{index + 1}</span><div><strong>{lesson.title}</strong><small>{lessonType(lesson.lesson_type).short} · {lesson.module || 'Sin módulo'}</small></div></div>)}</aside>
      </div>
    </section>}

    <LessonEditorModal
      open={lessonOpen}
      editing={lessonEditing}
      form={lessonForm}
      setForm={setLessonForm}
      modules={modules}
      notice={notice}
      saving={saving}
      onClose={() => setLessonOpen(false)}
      onSubmit={saveLesson}
      onTitleChange={changeLessonTitle}
    />

    <ConfirmDialog
      open={Boolean(removeLesson)}
      title="Eliminar lección"
      message={`Se eliminará permanentemente “${removeLesson?.title || ''}” y se recalculará el orden del curso.`}
      onClose={() => setRemoveLesson(null)}
      onConfirm={confirmRemoveLesson}
    />
    <MediaPicker
      open={mediaOpen}
      onClose={() => setMediaOpen(false)}
      title="Seleccionar portada del curso"
      onSelect={(asset) => {
        setCoverAsset(asset);
        setForm((current) => ({ ...current, image: asset.urls?.large || asset.urls?.original }));
      }}
    />
  </div>;
}
