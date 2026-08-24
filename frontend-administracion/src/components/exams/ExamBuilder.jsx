import { useEffect, useState } from 'react';
import {
  ArrowDown, ArrowUp, CheckCircle2, CirclePlus, HelpCircle, ListChecks, Trash2,
} from 'lucide-react';
import { Badge, Button, Input, Loader, Select, Textarea } from '@/components/common';
import { examService } from '@/services/examService';
import { createClientUuid } from '@/utils/clientId';
import './exam-builder.css';

const key = createClientUuid;
const defaultOptions = () => [
  { key: key(), text: '', correct: true },
  { key: key(), text: '', correct: false },
  { key: key(), text: '', correct: false },
  { key: key(), text: '', correct: false },
];
const trueFalseOptions = (correct = true) => [
  { key: key(), text: 'Verdadero', correct },
  { key: key(), text: 'Falso', correct: !correct },
];
const newQuestion = (type = 'MULTIPLE_CHOICE') => ({
  key: key(),
  type,
  prompt: '',
  explanation: '',
  points: 1,
  required: true,
  options: type === 'TRUE_FALSE' ? trueFalseOptions() : defaultOptions(),
});
const emptyExam = (lesson) => ({
  title: `Evaluación · ${lesson?.title || 'Lección'}`,
  description: 'Responde todas las preguntas y alcanza la nota mínima para aprobar.',
  passing_score: 70,
  max_attempts: 3,
  shuffle_questions: false,
  show_answers_after_submit: true,
  status: 'DRAFT',
  questions: [newQuestion()],
});
const fromApi = (exam, lesson) => exam ? {
  title: exam.title,
  description: exam.description || '',
  passing_score: Number(exam.passing_score),
  max_attempts: Number(exam.max_attempts),
  shuffle_questions: Boolean(exam.shuffle_questions),
  show_answers_after_submit: Boolean(exam.show_answers_after_submit),
  status: exam.status,
  questions: exam.questions.map((question) => ({
    key: question.id,
    type: question.question_type,
    prompt: question.prompt,
    explanation: question.explanation || '',
    points: Number(question.points),
    required: Boolean(question.is_required),
    options: question.options.map((option) => ({
      key: option.id,
      text: option.option_text,
      correct: Boolean(option.is_correct),
    })),
  })),
} : emptyExam(lesson);

export default function ExamBuilder({ lesson, onClose, onSaved }) {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    if (!lesson?.id) return;
    let active = true;
    setLoading(true);
    setExam(null);
    setError('');
    setSaved('');
    examService.getForLesson(lesson.id)
      .then((result) => { if (active) setExam(fromApi(result.exam, lesson)); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lesson, loadVersion]);

  const updateQuestion = (index, values) => setExam((current) => ({
    ...current,
    questions: current.questions.map((question, itemIndex) => (
      itemIndex === index ? { ...question, ...values } : question
    )),
  }));
  const changeType = (index, type) => {
    const previous = exam.questions[index];
    updateQuestion(index, {
      type,
      options: type === 'TRUE_FALSE'
        ? trueFalseOptions(previous.options.find((option) => option.correct)?.text !== 'Falso')
        : defaultOptions(),
    });
  };
  const updateOption = (questionIndex, optionIndex, values) => {
    const question = exam.questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, index) => index === optionIndex ? { ...option, ...values } : option),
    });
  };
  const markCorrect = (questionIndex, optionIndex) => {
    const question = exam.questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, index) => ({ ...option, correct: index === optionIndex })),
    });
  };
  const moveQuestion = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= exam.questions.length) return;
    const questions = [...exam.questions];
    [questions[index], questions[target]] = [questions[target], questions[index]];
    setExam({ ...exam, questions });
  };
  const removeQuestion = (index) => {
    if (exam.questions.length === 1) { setError('El examen debe conservar al menos una pregunta.'); return; }
    setExam({ ...exam, questions: exam.questions.filter((_, itemIndex) => itemIndex !== index) });
  };
  const addOption = (questionIndex) => {
    const question = exam.questions[questionIndex];
    updateQuestion(questionIndex, { options: [...question.options, { key: key(), text: '', correct: false }] });
  };

  const validate = () => {
    if (!exam.title.trim()) return 'Escribe el título del examen.';
    if (Number(exam.passing_score) < 0 || Number(exam.passing_score) > 100) return 'La nota aprobatoria debe estar entre 0 y 100.';
    for (const [index, question] of exam.questions.entries()) {
      if (!question.prompt.trim()) return `Escribe la pregunta ${index + 1}.`;
      const validOptions = question.options.filter((option) => option.text.trim());
      if (validOptions.length < 2) return `La pregunta ${index + 1} requiere al menos dos respuestas.`;
      if (validOptions.filter((option) => option.correct).length !== 1) return `Selecciona una sola respuesta correcta en la pregunta ${index + 1}.`;
    }
    return '';
  };
  const save = async (event) => {
    event.preventDefault();
    const validation = validate();
    if (validation) { setError(validation); return; }
    setSaving(true);
    setError('');
    setSaved('');
    try {
      const payload = {
        ...exam,
        passing_score: Number(exam.passing_score),
        max_attempts: Number(exam.max_attempts),
        questions: exam.questions.map((question) => ({
          type: question.type,
          prompt: question.prompt.trim(),
          explanation: question.explanation.trim(),
          points: Number(question.points),
          required: question.required,
          options: question.options.filter((option) => option.text.trim()).map((option) => ({
            text: option.text.trim(),
            correct: option.correct,
          })),
        })),
      };
      const result = await examService.saveForLesson(lesson.id, payload);
      setExam(fromApi(result, lesson));
      setSaved('Examen guardado correctamente.');
      onSaved?.(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section className="card exam-builder-state"><Loader label="Cargando constructor de examen" /></section>;
  if (!exam) return <section className="card exam-builder-state"><div className="alert alert--error">{error || 'No fue posible cargar el examen.'}</div><div><Button variant="secondary" onClick={onClose}>Volver al curso</Button><Button onClick={() => setLoadVersion((current) => current + 1)}>Reintentar</Button></div></section>;

  return <form className="exam-builder exam-builder--page" onSubmit={save}>
      <section className="exam-builder-intro">
        <div><Badge tone={exam.status === 'PUBLISHED' ? 'green' : 'gold'}>{exam.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}</Badge><strong>{lesson.title}</strong></div>
        <p>El alumno deberá aprobar esta evaluación antes de poder completar la lección y recibir XP.</p>
      </section>
      <div className="exam-builder-settings">
        <div className="exam-builder-main-settings">
          <Input label="Título del examen" value={exam.title} onChange={(event) => setExam({ ...exam, title: event.target.value })} />
          <Textarea label="Instrucciones" rows="3" value={exam.description} onChange={(event) => setExam({ ...exam, description: event.target.value })} />
        </div>
        <aside>
          <div className="form-grid">
            <Input label="Nota aprobatoria (%)" type="number" min="0" max="100" step="0.01" value={exam.passing_score} onChange={(event) => setExam({ ...exam, passing_score: event.target.value })} />
            <p className="exam-unlimited-attempts"><strong>Intentos ilimitados</strong><span>La primera aprobación habilita la lección; repetir no duplica XP.</span></p>
          </div>
          <Select label="Estado" value={exam.status} onChange={(event) => setExam({ ...exam, status: event.target.value })}><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicado</option><option value="ARCHIVED">Archivado</option></Select>
          <label className="check-field"><input type="checkbox" checked={exam.shuffle_questions} onChange={(event) => setExam({ ...exam, shuffle_questions: event.target.checked })} /> Mezclar preguntas para cada alumno</label>
          <label className="check-field"><input type="checkbox" checked={exam.show_answers_after_submit} onChange={(event) => setExam({ ...exam, show_answers_after_submit: event.target.checked })} /> Mostrar corrección después de entregar</label>
        </aside>
      </div>

      <div className="exam-question-heading"><div><ListChecks /><span><strong>Preguntas</strong><small>{exam.questions.length} en total · {exam.questions.reduce((sum, question) => sum + Number(question.points || 0), 0)} puntos</small></span></div><Button onClick={() => setExam({ ...exam, questions: [...exam.questions, newQuestion()] })}><CirclePlus /> Añadir pregunta</Button></div>
      <div className="exam-question-list">{exam.questions.map((question, questionIndex) => <article className="exam-question-card" key={question.key}>
        <header>
          <span>{questionIndex + 1}</span>
          <div><strong>{question.type === 'TRUE_FALSE' ? 'Verdadero o falso' : 'Opción múltiple'}</strong><small>{question.points} puntos</small></div>
          <div className="exam-question-actions"><button type="button" onClick={() => moveQuestion(questionIndex, -1)} disabled={questionIndex === 0} title="Subir"><ArrowUp /></button><button type="button" onClick={() => moveQuestion(questionIndex, 1)} disabled={questionIndex === exam.questions.length - 1} title="Bajar"><ArrowDown /></button><button type="button" className="danger" onClick={() => removeQuestion(questionIndex)} title="Eliminar"><Trash2 /></button></div>
        </header>
        <div className="exam-question-fields">
          <Select label="Tipo de pregunta" value={question.type} onChange={(event) => changeType(questionIndex, event.target.value)}><option value="MULTIPLE_CHOICE">Opción múltiple</option><option value="TRUE_FALSE">Verdadero / falso</option></Select>
          <Input label="Puntos" type="number" min="0.01" step="0.01" value={question.points} onChange={(event) => updateQuestion(questionIndex, { points: event.target.value })} />
        </div>
        <Textarea label="Pregunta" rows="3" value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} />
        <div className="exam-options">
          <p><CheckCircle2 /> Marca la respuesta correcta</p>
          {question.options.map((option, optionIndex) => <label className={option.correct ? 'correct' : ''} key={option.key}>
            <input type="radio" name={`correct-${question.key}`} checked={option.correct} onChange={() => markCorrect(questionIndex, optionIndex)} />
            <input value={option.text} readOnly={question.type === 'TRUE_FALSE'} placeholder={`Respuesta ${optionIndex + 1}`} onChange={(event) => updateOption(questionIndex, optionIndex, { text: event.target.value })} />
            {question.type === 'MULTIPLE_CHOICE' && question.options.length > 2 && <button type="button" onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })} aria-label="Eliminar respuesta"><Trash2 /></button>}
          </label>)}
          {question.type === 'MULTIPLE_CHOICE' && <button className="exam-add-option" type="button" onClick={() => addOption(questionIndex)}><CirclePlus /> Añadir otra respuesta</button>}
        </div>
        <Textarea label="Explicación al corregir (opcional)" rows="2" value={question.explanation} onChange={(event) => updateQuestion(questionIndex, { explanation: event.target.value })} />
      </article>)}</div>
      {error && <div className="alert alert--error">{error}</div>}
      {saved && <div className="source-note"><CheckCircle2 /> {saved}</div>}
      <footer className="exam-builder-footer"><div><HelpCircle /><span><strong>Nota mínima: {exam.passing_score}%</strong><small>El bloqueo sólo se aplica cuando el examen está publicado.</small></span></div><div><Button variant="secondary" onClick={onClose} disabled={saving}>Volver al curso</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando examen…' : 'Guardar examen'}</Button></div></footer>
    </form>;
}
