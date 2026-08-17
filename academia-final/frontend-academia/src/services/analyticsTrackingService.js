import { apiClient } from '@/services/apiClient';

const SESSION_KEY = 'cabsa_analytics_session';
const pending = new Set();
const recent = new Map();
let memorySessionId = null;

const sessionId = () => {
  let value = memorySessionId;
  try { value = localStorage.getItem(SESSION_KEY); } catch { /* almacenamiento restringido */ }
  if (!value) {
    value = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try { localStorage.setItem(SESSION_KEY, value); } catch { /* se conserva sólo en memoria */ }
  }
  memorySessionId = value;
  return value;
};

const eventKey = (category, event) => [
  category, event.event_type, event.section, event.path, event.action,
  event.area, event.level_slug, event.agent_key, event.provider,
].map((value) => String(value ?? '')).join('|');

const send = (category, event, cooldownMs, body) => {
  const key = eventKey(category, event);
  const now = Date.now();
  if (pending.has(key) || now - Number(recent.get(key) || 0) < cooldownMs) {
    return Promise.resolve({ saved: false, reason: 'CLIENT_DEDUPLICATED' });
  }
  pending.add(key);
  if (recent.size > 500) {
    for (const [storedKey, timestamp] of recent) {
      if (now - timestamp > 600_000) recent.delete(storedKey);
    }
  }
  return apiClient(`/api/analytics/track/${category}`, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((result) => {
    recent.set(key, Date.now());
    return result;
  }).finally(() => pending.delete(key));
};

export const analyticsTrackingService = {
  platform(event) {
    const cooldown = event.event_type === 'PAGE_VIEW' ? 300_000 : 60_000;
    return send('platform', event, cooldown, {
      ...event,
      session_id: sessionId(),
      device: window.innerWidth <= 640 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop',
    });
  },
  ai(event) {
    const cooldown = event.event_type === 'click' ? 60_000 : 300_000;
    return send('ai', event, cooldown, {
        ...event,
        session_id: sessionId(),
        page_url: window.location.href,
        referrer: document.referrer || '',
        device: window.innerWidth <= 640 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop',
        viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
  },
};
