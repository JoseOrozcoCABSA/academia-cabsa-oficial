import { useEffect, useRef, useState } from 'react';
import { Clock3, Pause, Play, ShieldCheck } from 'lucide-react';
import { gamificationService } from '@/services/gamificationService';
import './lesson-reading-timer.css';

const time = (seconds) => {
  const safe = Math.max(0, Number(seconds || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(Math.floor(safe % 60)).padStart(2, '0')}`;
};

export default function LessonReadingTimer({ courseId, lessonId, initialTimer, onUpdate }) {
  const [timer, setTimer] = useState(initialTimer || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef(timer);

  useEffect(() => { setTimer(initialTimer || null); }, [lessonId, initialTimer?.elapsedSeconds, initialTimer?.ready]);
  useEffect(() => { timerRef.current = timer; onUpdate?.(timer); }, [timer]);

  const sync = async (operation) => {
    setBusy(true);
    setError('');
    try { setTimer(await operation(courseId, lessonId)); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!timer?.active) return undefined;
    const visual = window.setInterval(() => setTimer((current) => current ? {
      ...current,
      elapsedSeconds: current.elapsedSeconds + 1,
      remainingSeconds: Math.max(0, current.remainingSeconds - 1),
      ready: current.remainingSeconds <= 1,
    } : current), 1000);
    const heartbeat = window.setInterval(() => sync(gamificationService.heartbeatReadingTimer), 15000);
    return () => { window.clearInterval(visual); window.clearInterval(heartbeat); };
  }, [courseId, lessonId, timer?.active]);

  useEffect(() => {
    if (timer?.active && timer?.ready) sync(gamificationService.pauseReadingTimer);
  }, [timer?.active, timer?.ready]);

  useEffect(() => {
    const visibility = () => {
      if (document.hidden && timerRef.current?.active) sync(gamificationService.pauseReadingTimer);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [courseId, lessonId]);

  if (!timer?.enabled) return null;
  const progress = timer.minimumSeconds ? Math.min(100, (timer.elapsedSeconds / timer.minimumSeconds) * 100) : 100;
  return <section className={`lesson-reading-timer${timer.ready ? ' ready' : ''}`} aria-live="polite">
    <header><span><Clock3 /></span><div><p>TIEMPO DE ESTUDIO</p><h2>Cronómetro de lectura</h2></div>{timer.ready && <strong><ShieldCheck /> Tiempo cumplido</strong>}</header>
    <div className="lesson-reading-clock"><strong>{time(timer.elapsedSeconds)}</strong><span>de {time(timer.minimumSeconds)} requeridos</span></div>
    <div className="lesson-reading-progress"><i style={{ width: `${progress}%` }} /></div>
    <p>{timer.ready ? 'Ya cumpliste el tiempo mínimo. Puedes completar la lección cuando termines.' : `Faltan ${time(timer.remainingSeconds)} de lectura activa. El tiempo se pausa al cambiar de pestaña.`}</p>
    <button type="button" disabled={busy || timer.ready} onClick={() => sync(timer.active ? gamificationService.pauseReadingTimer : gamificationService.startReadingTimer)}>
      {timer.active ? <><Pause /> Pausar cronómetro</> : <><Play /> {timer.elapsedSeconds ? 'Continuar cronómetro' : 'Activar cronómetro'}</>}
    </button>
    {error && <small className="error">{error}</small>}
  </section>;
}
