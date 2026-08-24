/** @file Protección disuasoria de copia para materiales académicos autenticados. */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import './content-protection.css';

const protectedPrefixes = [
  '/cursos', '/mediateca', '/capsulas', '/novedades', '/videos', '/documentos',
  '/ai', '/agentes-gpt', '/asistentes', '/foros',
];
const editable = (target) => target instanceof Element && Boolean(
  target.closest('input,textarea,select,[contenteditable="true"],.allow-copy'),
);

export default function ContentProtection() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const enabled = isAuthenticated && protectedPrefixes.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));

  useEffect(() => {
    if (!enabled) return undefined;
    document.body.classList.add('protected-learning-content');
    const prevent = (event) => {
      if (!editable(event.target)) event.preventDefault();
    };
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('dragstart', prevent);
    document.addEventListener('selectstart', prevent);
    return () => {
      document.body.classList.remove('protected-learning-content');
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('dragstart', prevent);
      document.removeEventListener('selectstart', prevent);
    };
  }, [enabled]);

  return enabled
    ? <div className="content-protection-badge" role="status">Contenido protegido contra copia</div>
    : null;
}
