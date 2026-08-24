import { Clock3, FileQuestion } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '@/components/common';
import { lessonType, lessonTypes, slugify } from './courseEditorModel';

export default function LessonEditorModal({ open, editing, form, setForm, modules, notice, saving, onClose, onSubmit, onTitleChange }) {
  return <Modal open={open} title={editing ? 'Editar lección completa' : 'Crear lección'} onClose={() => !saving && onClose()}>
    <form className="resource-form lesson-editor-form" onSubmit={onSubmit}>
      <Input label="Título *" value={form.title} onChange={(event) => onTitleChange(event.target.value)} />
      <Select label="Tipo de lección *" value={form.lesson_type} onChange={(event) => setForm({ ...form, lesson_type: event.target.value })}>{Object.entries(lessonTypes).map(([value, type]) => <option value={value} key={value}>{type.label}</option>)}</Select>
      <div className={`lesson-type-note lesson-type-note--${form.lesson_type.toLowerCase()}`}><FileQuestion /><div><strong>{lessonType(form.lesson_type).label}</strong><p>{lessonType(form.lesson_type).description}</p>{form.lesson_type === 'EXAM' && <small>Al guardar se abrirá una página especializada para agregar preguntas, respuestas correctas y puntaje. Los intentos del alumno son ilimitados.</small>}</div></div>
      <div className="form-grid"><Input label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} /><Input label="Módulo" list="course-modules" value={form.module} onChange={(event) => setForm({ ...form, module: event.target.value })} /><datalist id="course-modules">{modules.map((module) => <option key={module} value={module} />)}</datalist></div>
      <Input label="Tiempo mínimo de lectura (minutos)" type="number" min="1" max="240" value={form.minimum_reading_minutes} onChange={(event) => setForm({ ...form, minimum_reading_minutes: event.target.value })} />
      <div className="lesson-timer-note"><Clock3 /><p>Este tiempo se exigirá solamente cuando el cronómetro esté activado en la configuración principal del curso.</p></div>
      <Textarea label="Resumen de la lección" rows="3" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
      <Textarea label="Contenido completo (admite HTML)" rows="15" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
      <p className="lesson-html-note">El HTML guardado se conserva íntegro para que el portal académico pueda interpretarlo.</p>
      {notice && <div className="alert alert--error">{notice}</div>}
      <div className="modal-actions"><Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar lección'}</Button></div>
    </form>
  </Modal>;
}
