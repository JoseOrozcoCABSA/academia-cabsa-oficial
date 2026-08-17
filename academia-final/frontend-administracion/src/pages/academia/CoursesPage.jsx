import { useCallback, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CopyPlus, Edit3, Plus, RefreshCw, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { academiaService } from '@/services/academiaService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, EmptyState, Input, Loader, Modal, Select, Textarea } from '@/components/common';
import './course-editor.css';

const emptyCourse = {
  title: '',
  slug: '',
  summary: '',
  description: '',
  category: '',
  image: '',
  status: 'draft',
};

const slugify = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export default function CoursesPage() {
  const navigate = useNavigate();
  const loader = useCallback(
    () => academiaService.list('courses', '?limit=100&orderBy=updated_at&orderDirection=DESC'),
    [],
  );
  const { items, loading, error, reload } = useRemoteList(loader, []);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyCourse);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const courses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((course) => [course.title, course.slug, course.category, course.status]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [items, search]);

  const changeTitle = (title) => setForm((current) => ({
    ...current,
    title,
    slug: current.slug && current.slug !== slugify(current.title) ? current.slug : slugify(title),
  }));

  const createCourse = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.summary.trim()) {
      setNotice('Título, slug y resumen son obligatorios.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const created = await academiaService.create('courses', {
        ...form,
        lessons_count: 0,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
      });
      setOpen(false);
      setForm(emptyCourse);
      await reload();
      navigate(`/academia/cursos/${created.id}/editar`);
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const duplicateCourse = async (course) => {
    setNotice('');
    try {
      const created = await academiaService.create('courses', {
        slug: `${course.slug}-copia-${Date.now().toString().slice(-5)}`,
        title: `${course.title} (copia)`,
        summary: course.summary,
        description: course.description,
        image: course.image,
        category: course.category,
        lessons_count: 0,
        status: 'draft',
        published_at: null,
      });
      const lessons = await academiaService.list(
        'lessons',
        `?course_id=${course.id}&limit=100&orderBy=number`,
      );
      for (const lesson of lessons) {
        await academiaService.create('lessons', {
          course_id: created.id,
          number: lesson.number,
          slug: lesson.slug,
          title: lesson.title,
          module: lesson.module,
          summary: lesson.summary,
          content: lesson.content,
        });
      }
      await academiaService.update('courses', created.id, { lessons_count: lessons.length });
      await reload();
      navigate(`/academia/cursos/${created.id}/editar`);
    } catch (requestError) {
      setNotice(requestError.message);
    }
  };

  return <div className="page admin-page courses-admin">
    <div className="page-heading">
      <div>
        <p className="eyebrow">Administración de contenido</p>
        <h1>Edición integral de cursos</h1>
        <p>Administra la ficha, publicación, módulos, lecciones, contenido y orden desde un solo lugar.</p>
      </div>
      <Button onClick={() => { setNotice(''); setForm(emptyCourse); setOpen(true); }}><Plus /> Crear curso</Button>
    </div>

    <div className="resource-toolbar">
      <label className="search search--page"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar curso, categoría o estado" /></label>
      <button className="icon-button refresh" onClick={reload} aria-label="Actualizar"><RefreshCw /></button>
      <span>{courses.length} cursos</span>
    </div>
    {error && <div className="alert alert--error">{error}</div>}
    {notice && <div className="alert alert--error">{notice}</div>}

    {loading ? <section className="card"><Loader label="Cargando cursos" /></section> : courses.length
      ? <section className="course-admin-grid">{courses.map((course) => <article className="course-admin-card" key={course.id}>
        <div className="course-admin-cover">
          {course.image ? <img src={course.image} alt="" /> : <BookOpen />}
          <Badge tone={course.status === 'published' ? 'green' : course.status === 'draft' ? 'gold' : 'neutral'}>
            {course.status === 'published' ? 'Publicado' : course.status === 'draft' ? 'Borrador' : 'Archivado'}
          </Badge>
        </div>
        <div className="course-admin-body">
          <small>{course.category || 'Sin categoría'} · {course.lessons_count || 0} lecciones</small>
          <h2>{course.title}</h2>
          <p>{course.summary || 'Sin resumen.'}</p>
          <code>/{course.slug}</code>
          <div className="course-admin-actions">
            <Link className="button button--primary" to={`/academia/cursos/${course.id}/editar`}><Edit3 /> Editar todo <ArrowRight /></Link>
            <Button variant="secondary" onClick={() => duplicateCourse(course)} title="Duplicar curso"><CopyPlus /> Duplicar</Button>
          </div>
        </div>
      </article>)}</section>
      : <section className="card"><EmptyState title="No hay cursos" description="Crea el primer curso y agrega su estructura completa." action={<Button onClick={() => setOpen(true)}><Plus /> Crear curso</Button>} /></section>}

    <Modal open={open} title="Crear un curso" onClose={() => !saving && setOpen(false)}>
      <form className="resource-form" onSubmit={createCourse}>
        <Input label="Título *" value={form.title} onChange={(event) => changeTitle(event.target.value)} />
        <Input label="Slug *" value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} />
        <Textarea label="Resumen *" rows="3" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
        <Textarea label="Descripción" rows="5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <div className="form-grid">
          <Input label="Categoría" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <Select label="Estado" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </Select>
        </div>
        <Input label="URL de imagen" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} />
        {notice && <div className="alert alert--error">{notice}</div>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear y editar estructura'}</Button>
        </div>
      </form>
    </Modal>
  </div>;
}
