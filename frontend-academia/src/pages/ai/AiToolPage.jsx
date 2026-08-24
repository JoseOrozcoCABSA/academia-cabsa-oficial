/**
 * @file Componente `AiToolPage`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import catalog from '@/data/aiToolsCatalog.json';
import { sanitizeContentHtml } from '@/utils/sanitizeContentHtml';
import { aiCatalogService } from '@/services/aiCatalogService';
import { useMembershipAccess } from '@/hooks/useMembershipAccess';
import { analyticsTrackingService } from '@/services/analyticsTrackingService';
import '@/ai-tools.css';

/**
 * Ficha de asistentes o tutores de IA para un nivel educativo.
 *
 * Una sola pantalla sirve a los dos tipos y a todos los niveles: el contenido
 * sale de un catalogo fijo indexado por `toolType` y por el nivel de la URL.
 *
 * Una combinacion inexistente redirige a la portada con `replace`, de modo que
 * el boton de retroceso no vuelve a la URL invalida.
 */
export default function AiToolPage({ toolType }) {
  const { level } = useParams();
  const { resourceAllowed } = useMembershipAccess();
  const page = catalog[toolType]?.[level];
  const accessType = toolType === 'tutor' ? 'tutor_page' : 'assistant_page';
  const accessKey = toolType === 'assistant' ? `asistentes-${level}` : level === 'secundaria' ? 'tutores-secundaria-alumnos' : `tutores-${level}`;
  const [managedLinks, setManagedLinks] = useState([]);

  useEffect(() => {
    let active = true;
    aiCatalogService.assistantTutorLinks()
      .then((rows) => { if (active) setManagedLinks(rows); })
      .catch(() => { /* El catálogo estático mantiene disponible la página. */ });
    return () => { active = false; };
  }, []);

  const managedPage = useMemo(() => {
    if (!page || !managedLinks.length) return page;
    const slug = toolType === 'assistant'
      ? `asistentes-${level}`
      : level === 'secundaria'
        ? 'tutores-secundaria-alumnos'
        : `tutores-${level}`;
    const rows = managedLinks
      .filter((row) => row.slug === slug)
      .sort((left, right) => Number.parseInt(left.numero, 10) - Number.parseInt(right.numero, 10));
    if (!rows.length) return page;
    const usedIds = new Set();
    const cards = page.cards.map((card) => {
      const number = Number.parseInt(card.number, 10);
      const row = rows.find((candidate) => Number.parseInt(candidate.numero, 10) === number);
      if (!row) return card;
      usedIds.add(row.id);
      return { ...card, gpt_url: row.gpt_url || '', gemini_url: row.gem_url || '' };
    });
    const integratorRow = rows.find((row) => !usedIds.has(row.id));
    const integrator = page.integrator && integratorRow
      ? {
        ...page.integrator,
        gpt_url: integratorRow.gpt_url || '',
        gemini_url: integratorRow.gem_url || '',
      }
      : page.integrator;
    return { ...page, cards, integrator };
  }, [level, managedLinks, page, toolType]);

  const area = toolType === 'tutor' ? 'tutor' : 'asistente';
  const trackCard = useCallback((eventType, card, index, provider = null) => {
    analyticsTrackingService.ai({
      event_type: eventType,
      area,
      level_slug: level,
      agent_key: `${area}-${level}-${index}`,
      agent_title: card.title,
      card_index: index,
      provider,
    }).catch(() => {});
  }, [area, level]);

  useEffect(() => {
    if (!page) return;
    analyticsTrackingService.ai({
      event_type: 'page_view',
      area: 'pagina',
      level_slug: level,
      agent_key: `pagina-${area}-${level}`,
      agent_title: page.title,
      card_index: 0,
    }).catch(() => {});
  }, [area, level, page]);

  if (!page) return <Navigate to="/" replace />;
  if (!resourceAllowed(accessType, accessKey)) return <div className="ai-catalog-page"><Header /><main id="main-content"><section className="membership-gate"><div className="card"><h1>Herramienta no disponible para tu beca</h1><p>El administrador bloqueó esta página de {toolType === 'tutor' ? 'tutores' : 'asistentes'} para tu tipo de beca.</p></div></section></main><Footer /></div>;

  return (
    <div className="ai-catalog-page">
      <Header />
      <main id="main-content">
        <div className="ai-page" data-ai-page data-ai-tool-type={toolType} data-ai-level={level}>
          <section className="ai-intro">
            <div className="ai-intro-img">
              <img src={managedPage.intro_image} alt={managedPage.title} loading="lazy" />
            </div>
            <div className="ai-intro-text">
              <h1>{managedPage.title}</h1>
              {managedPage.intro.map((paragraph) => (
                <p key={paragraph} dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(paragraph) }} />
              ))}
              <hr />
              <p dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(managedPage.highlights) }} />
            </div>
          </section>

          <section className="ai-grid" aria-label={`${managedPage.title} por grado`}>
            {managedPage.cards.map((card, index) => <AiToolCard card={card} index={index + 1} key={card.title} onTrack={trackCard} />)}
          </section>

          {managedPage.integrator && (
            <section className="ai-centered" aria-label="Asistente integrador">
              <AiToolCard card={managedPage.integrator} index={managedPage.cards.length + 1} onTrack={trackCard} />
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** Tarjeta de una herramienta, con su enlace externo. Solo presentacion. */
function AiToolCard({ card, index, onTrack }) {
  const linkOrDisabled = (url) => url || undefined;
  const cardRef = useRef(null);
  const impressionSent = useRef(false);
  useEffect(() => {
    const element = cardRef.current;
    if (!element || impressionSent.current) return undefined;
    if (!('IntersectionObserver' in window)) {
      impressionSent.current = true;
      onTrack('impression', card, index);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.35 && !impressionSent.current) {
        impressionSent.current = true;
        onTrack('impression', card, index);
        observer.disconnect();
      }
    }, { threshold: [0.35] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [card, index, onTrack]);
  return (
    <article className="ai-card" ref={cardRef}>
      <h2>{card.title}</h2>
      <div className="ai-agent-media">
        <img src={card.image} alt={card.title} loading="lazy" />
        <div className="ai-agent-actions">
          <a
            href={linkOrDisabled(card.gpt_url)}
            className={`ai-btn ai-btn-gpt${card.gpt_url ? '' : ' is-disabled'}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir ${card.title} en ChatGPT`}
            data-tooltip="Accede al Asistente Basado en Chat GPT"
            data-ai-provider="gpt"
            onClick={() => onTrack('click', card, index, 'chatgpt')}
          >
            <svg width="24" height="24" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true">
              <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
            </svg>
            <span>GPTs</span>
          </a>
          <a
            href={linkOrDisabled(card.gemini_url)}
            className={`ai-btn ai-btn-gem${card.gemini_url ? '' : ' is-disabled'}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir ${card.title} en Gemini`}
            data-tooltip="Accede al Asistente Basado en Gemini"
            data-ai-provider="gemini"
            onClick={() => onTrack('click', card, index, 'gemini')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true">
              <path d="M12 24c0-6.627-5.373-12-12-12 6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12-6.627 0-12 5.373-12 12Z" />
            </svg>
            <span>Gems</span>
          </a>
        </div>
      </div>
      <p dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(card.description) }} />
    </article>
  );
}
