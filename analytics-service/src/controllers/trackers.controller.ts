import type { Request, Response } from 'express';
import { verifyToken } from '#config/jwt';
import repository, { type TrackerFilters } from '#repositories/trackers.repository';
import { ok } from '#utils/response';
import { AppError } from '#utils/errors';

const text = (value: unknown, length: number) => String(value ?? '').trim().slice(0, length);
const allowed = (value: unknown, values: string[], fallback = '') => {
  const normalized = text(value, 40);
  return values.includes(normalized) ? normalized : fallback;
};
const date = (value: unknown, fallback: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))
  ? String(value)
  : fallback;
const scholarshipLevel = (value: unknown) => {
  const normalized = text(value, 20);
  return normalized === '' || /^[1-9]\d{0,18}$/.test(normalized) ? normalized : '';
};
const filters = (request: Request): TrackerFilters => {
  const today = new Date();
  const first = new Date(today);
  first.setUTCDate(today.getUTCDate() - 29);
  const from = date(request.query.from, first.toISOString().slice(0, 10));
  const to = date(request.query.to, today.toISOString().slice(0, 10));
  if (from > to) throw new AppError('La fecha inicial no puede ser posterior a la final.', 400, 'INVALID_DATE_RANGE');
  const rangeDays = Math.floor(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  ) + 1;
  if (rangeDays > 31) {
    throw new AppError(
      'El rango máximo de analítica detallada es de 31 días.',
      400,
      'DATE_RANGE_TOO_LARGE',
    );
  }
  return {
    from,
    to,
    area: allowed(request.query.area, ['', 'asistente', 'tutor', 'pagina']),
    level: allowed(request.query.level, ['', 'preescolar', 'primaria', 'secundaria']),
    event: allowed(request.query.event, ['', 'page_view', 'impression', 'click']),
    courseId: text(request.query.courseId, 30),
    user: text(request.query.user, 100),
    scholarshipLevel: scholarshipLevel(request.query.scholarshipLevel),
  };
};
const optionalIdentity = (request: Request) => {
  const authorization = request.header('authorization');
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!match) return { accountId: null, roleCode: null };
  try {
    const payload = verifyToken(match[1]);
    if (typeof payload === 'string') return { accountId: null, roleCode: null };
    const roles = Array.isArray(payload.roles) ? payload.roles.map(String) : [];
    return {
      accountId: payload.sub ?? null,
      roleCode: roles.includes('TEACHER') ? 'TEACHER' : roles.includes('STUDENT') ? 'STUDENT' : roles[0] ?? null,
    };
  } catch {
    return { accountId: null, roleCode: null };
  }
};
const validUrl = (value: unknown) => {
  const candidate = text(value, 1000);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

const platformSections = [
  'Inicio', 'Cursos', 'Lecciones', 'Herramientas IA', 'Mediateca', 'Foros',
  'Perfil y beca', 'Panel docente', 'Biblioteca', 'Soporte',
  'Información y legal', 'Acceso', 'Otra sección',
];

export const trackAi = async (request: Request, response: Response): Promise<void> => {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const eventType = allowed(body.event_type, ['page_view', 'impression', 'click']);
  const area = allowed(body.area, ['asistente', 'tutor', 'pagina']);
  const level = allowed(body.level_slug, ['preescolar', 'primaria', 'secundaria']);
  const sessionId = text(body.session_id, 100);
  if (!eventType || !area || !level || sessionId.length < 8) {
    throw new AppError('Evento de analítica incompleto.', 400, 'INVALID_TRACK_EVENT');
  }
  const result = await repository.recordAiEvent({
    eventType,
    area,
    level,
    agentKey: text(body.agent_key, 80),
    agentTitle: text(body.agent_title, 190),
    provider: eventType === 'click' ? allowed(body.provider, ['chatgpt', 'gemini']) || null : null,
    cardIndex: Math.max(0, Math.min(100, Number.parseInt(text(body.card_index, 4), 10) || 0)),
    pageUrl: validUrl(body.page_url),
    referrer: validUrl(body.referrer),
    accountId: optionalIdentity(request).accountId,
    sessionId,
    ip: request.ip || request.socket.remoteAddress || '',
    userAgent: text(request.header('user-agent'), 500),
    device: allowed(body.device, ['desktop', 'mobile', 'tablet'], 'desktop'),
    viewport: /^\d{1,5}x\d{1,5}$/.test(text(body.viewport, 30)) ? text(body.viewport, 30) : '',
  });
  ok(response, result, result.saved ? 201 : 200);
};

export const trackPlatform = async (request: Request, response: Response): Promise<void> => {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const eventType = allowed(text(body.event_type, 40).toUpperCase(), ['PAGE_VIEW', 'CLICK']) as 'PAGE_VIEW' | 'CLICK';
  const section = allowed(body.section, platformSections, 'Otra sección');
  const rawPath = text(body.path, 1000);
  const path = rawPath.startsWith('/') ? rawPath.split(/[?#]/, 1)[0].slice(0, 255) : '';
  const sourceAddress = request.ip || request.socket.remoteAddress || '';
  const sessionId = text(body.session_id, 100)
    || `${sourceAddress}:${text(request.header('user-agent'), 80)}`;
  if (!eventType || !section || !path.startsWith('/') || sessionId.length < 8) {
    throw new AppError('Evento de plataforma incompleto.', 400, 'INVALID_PLATFORM_EVENT');
  }
  const identity = optionalIdentity(request);
  const result = await repository.recordPlatformEvent({
    eventType,
    section,
    action: eventType === 'CLICK' ? text(body.action, 160) || null : null,
    path,
    accountId: identity.accountId,
    roleCode: identity.roleCode,
    sessionId,
    ip: sourceAddress,
    device: allowed(body.device, ['desktop', 'tablet', 'mobile'], 'desktop') as 'desktop' | 'tablet' | 'mobile',
  });
  ok(response, result, result.saved ? 201 : 200);
};

export const aiTracker = async (request: Request, response: Response): Promise<void> => {
  ok(response, await repository.ai(filters(request)));
};
export const capsuleTracker = async (request: Request, response: Response): Promise<void> => {
  ok(response, await repository.capsules(filters(request)));
};
export const courseTracker = async (request: Request, response: Response): Promise<void> => {
  ok(response, await repository.courses(filters(request)));
};
