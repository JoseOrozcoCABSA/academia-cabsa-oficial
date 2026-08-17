import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RotateCcw, Send, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Loader } from '@/components/common';
import { examService } from '@/services/examService';
import './lesson-exam.css';

const number = (value) => Number(value || 0);

export default function LessonExam({ lessonId, isAuthenticated, onPassed }) {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempting, setAttempting] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    if (!isAuthenticated || !lessonId) return Promise.resolve();
    setLoading(true);
    setError('');
    return examService.forLesson(lessonId)
      .then((payload) => setExam(payload.exam))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [isAuthenticated, lessonId]);

  if (!isAuthenticated) return <section className="lesson-exam lesson-exam--login">
    <ClipboardCheck /><div><h2>Evaluación de la lección</h2><p>Inicia sesión para responder el examen y obtener tu calificación.</p><Link to="/login">Iniciar sesión</Link></div>
  </section>;
  if (loading) return <section className="lesson-exam"><Loader label="Cargando evaluación" /></section>;
  if (error && !exam) return <section className="lesson-exam"><p className="gamification-feedback error">{error}</p></section>;
  if (!exam) return null;

  const progress = exam.progress || {};
  const passedBefore = Boolean(progress.passed);
  const attemptsUsed = number(progress.attempts_used);
  const answered = Object.keys(answers).length;

  const submit = async (event) => {
    event.preventDefault();
    if (answered < exam.questions.length) {
      setError('Responde todas las preguntas antes de entregar el examen.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const submission = await examService.submit(exam.id, Object.entries(answers).map(([questionId, optionId]) => ({
        question_id: questionId,
        option_id: optionId,
      })));
      setResult(submission);
      setAttempting(false);
      if (submission.passed) onPassed?.(submission);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
    setError('');
    setAttempting(true);
  };

  return <section className={`lesson-exam${passedBefore || result?.passed ? ' lesson-exam--passed' : ''}`} aria-labelledby="lesson-exam-title">
    <header>
      <span><ClipboardCheck /></span>
      <div><p>EVALUACIÓN CALIFICADA</p><h2 id="lesson-exam-title">{exam.title}</h2><small>{exam.questions.length} preguntas · Aprobación: {number(exam.passing_score)}% · intentos ilimitados</small></div>
      {(passedBefore || result?.passed) && <strong className="lesson-exam-approved"><CheckCircle2 /> Aprobado</strong>}
    </header>
    {exam.description && <p className="lesson-exam-description">{exam.description}</p>}
    <div className="lesson-exam-progress">
      <span>Intentos realizados: <strong>{attemptsUsed} · sin límite</strong></span>
      <span>Mejor calificación: <strong>{number(progress.best_score).toFixed(1)}%</strong></span>
    </div>

    {result && <section className={`lesson-exam-result ${result.passed ? 'passed' : 'failed'}`} role="status">
      {result.passed ? <CheckCircle2 /> : <XCircle />}
      <div><p>{result.passed ? 'Examen aprobado' : 'Aún no alcanzas la nota mínima'}</p><strong>{number(result.score).toFixed(1)}%</strong><span>{number(result.earnedPoints)} de {number(result.totalPoints)} puntos · mínimo {number(result.passingScore)}%</span></div>
    </section>}

    {result?.answers?.some((answer) => answer.prompt) && <div className="lesson-exam-review">{result.answers.map((answer, index) => <article className={answer.correct ? 'correct' : 'incorrect'} key={`${answer.questionId}-${index}`}>
      <span>{answer.correct ? <CheckCircle2 /> : <XCircle />}</span>
      <div><strong>{answer.prompt}</strong><p>Tu respuesta: {answer.selectedText || 'Sin respuesta'}</p>{!answer.correct && <p>Respuesta correcta: {answer.correctText}</p>}{answer.explanation && <small>{answer.explanation}</small>}</div>
    </article>)}</div>}

    {attempting && !result && <form onSubmit={submit} className="lesson-exam-form">
      {exam.questions.map((question, index) => <fieldset key={question.id}>
        <legend><span>{index + 1}</span><strong>{question.prompt}</strong><small>{number(question.points)} {number(question.points) === 1 ? 'punto' : 'puntos'}</small></legend>
        <div>{question.options.map((option) => <label className={answers[question.id] === option.id ? 'selected' : ''} key={option.id}>
          <input type="radio" name={`question-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers({ ...answers, [question.id]: option.id })} />
          <span>{option.option_text}</span>
        </label>)}</div>
      </fieldset>)}
      {error && <p className="gamification-feedback error" role="alert">{error}</p>}
      <footer><span>{answered} de {exam.questions.length} respondidas</span><button type="submit" disabled={submitting}>{submitting ? 'Calificando…' : <><Send /> Entregar y calificar</>}</button></footer>
    </form>}
    {!attempting && result && <button type="button" className="lesson-exam-retry" onClick={retry}><RotateCcw /> Volver a intentar el examen</button>}
    {(passedBefore || result?.passed) && <p className="lesson-exam-success-note">El examen permanece aprobado. Puedes repetirlo para practicar; el XP ya obtenido no se duplica ni se elimina.</p>}
  </section>;
}
