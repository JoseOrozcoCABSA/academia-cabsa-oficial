import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsTrackingService } from '@/services/analyticsTrackingService';

const sectionForPath = (path) => {
  if (path === '/') return 'Inicio';
  if (path.startsWith('/cursos')) return 'Cursos';
  if (path.startsWith('/lecciones')) return 'Lecciones';
  if (path.startsWith('/ai') || path.startsWith('/agentes-gpt') || path.startsWith('/asistentes')) return 'Herramientas IA';
  if (path.startsWith('/mediateca') || path.startsWith('/capsulas')) return 'Mediateca';
  if (path.startsWith('/foros')) return 'Foros';
  if (path.startsWith('/perfil') || path.startsWith('/beca')) return 'Perfil y beca';
  if (path.startsWith('/docente')) return 'Panel docente';
  if (path.startsWith('/videos') || path.startsWith('/documentos')) return 'Biblioteca';
  if (path.startsWith('/soporte')) return 'Soporte';
  if (path.startsWith('/terminos') || path.startsWith('/aviso-privacidad') || path.startsWith('/privacidad') || path.startsWith('/documentacion')) return 'Información y legal';
  if (path.startsWith('/login') || path.startsWith('/registro')) return 'Acceso';
  return path.split('/').filter(Boolean)[0] || 'Otra sección';
};

let lastPageView = { key: '', at: 0 };

export default function PlatformTracker() {
  const location = useLocation();

  useEffect(() => {
    const key = `${location.pathname}${location.search}`;
    const now = Date.now();
    if (lastPageView.key !== key || now - lastPageView.at > 1500) {
      lastPageView = { key, at: now };
      analyticsTrackingService.platform({
        event_type: 'PAGE_VIEW',
        section: sectionForPath(location.pathname),
        path: key,
      }).catch(() => undefined);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onClick = (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('a,button,[role="button"]')
        : null;
      if (!target) return;
      if (target.matches('[disabled],[aria-disabled="true"]')) return;
      const action = target.getAttribute('data-analytics-action')
        || target.getAttribute('aria-label')
        || target.getAttribute('title')
        || target.textContent?.replace(/\s+/g, ' ').trim()
        || target.tagName.toLowerCase();
      const safeAction = action
        .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[correo]')
        .replace(/\b\d{6,}\b/g, '[dato]')
        .replace(/\s+/g, ' ')
        .trim();
      if (!safeAction) return;
      analyticsTrackingService.platform({
        event_type: 'CLICK',
        section: sectionForPath(window.location.pathname),
        action: safeAction.slice(0, 160),
        path: `${window.location.pathname}${window.location.search}`,
      }).catch(() => undefined);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
