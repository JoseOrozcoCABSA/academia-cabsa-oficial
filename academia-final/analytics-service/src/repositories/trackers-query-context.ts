import { createHash } from 'node:crypto';
import { QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';
import env from '#config/env';

export interface TrackerFilters {
  from: string;
  to: string;
  area?: string;
  level?: string;
  event?: string;
  courseId?: string;
  user?: string;
  scholarshipLevel?: string;
}

export type Row = Record<string, unknown>;

export const rows = <T extends Row>(
  sql: string,
  replacements: Record<string, unknown> = {},
): Promise<T[]> => database.query<T>(sql, { replacements, type: QueryTypes.SELECT });

export const first = async <T extends Row>(
  sql: string,
  replacements: Record<string, unknown> = {},
): Promise<T> => (await rows<T>(sql, replacements))[0] ?? {} as T;

export const range = (filters: TrackerFilters, column: string) => ({
  sql: `${column} BETWEEN :fromDate AND :toDate`,
  values: {
    fromDate: `${filters.from} 00:00:00`,
    toDate: `${filters.to} 23:59:59`,
  },
});

export const normalizedNumber = (value: unknown) => Number(value ?? 0);

export const membershipCondition = (
  filters: TrackerFilters,
  accountExpression: string,
  legacyExpression: string,
) => !filters.scholarshipLevel ? '1=1' : `(
  EXISTS (
    SELECT 1 FROM usuarios_activaciones_becas membership_activation
    WHERE membership_activation.user_id=${accountExpression}
      AND membership_activation.nivel_membresia_id=:scholarshipLevel
      AND membership_activation.suspended_at IS NULL
      AND (membership_activation.vigente_hasta IS NULL OR membership_activation.vigente_hasta>=CURDATE())
  ) OR EXISTS (
    SELECT 1 FROM usuarios_membresias legacy_membership
    WHERE legacy_membership.user_id=${legacyExpression}
      AND legacy_membership.membership_id=:scholarshipLevel
      AND legacy_membership.status='active'
      AND (legacy_membership.enddate IS NULL OR legacy_membership.enddate>=NOW())
  )
)`;

export const membershipFilter = (
  filters: TrackerFilters,
  accountExpression: string,
  legacyExpression: string,
) => filters.scholarshipLevel
  ? `AND ${membershipCondition(filters, accountExpression, legacyExpression)}`
  : '';

export const activeMembershipsSql = `
  SELECT DISTINCT active_membership.user_id,active_membership.level_id
  FROM (
    SELECT activation.user_id,activation.nivel_membresia_id level_id
    FROM usuarios_activaciones_becas activation
    WHERE activation.suspended_at IS NULL
      AND (activation.vigente_hasta IS NULL OR activation.vigente_hasta>=CURDATE())
    UNION
    SELECT account.id user_id,legacy.membership_id level_id
    FROM usuarios_membresias legacy
    INNER JOIN usuarios_cuentas account ON account.legacy_wp_user_id=legacy.user_id
    WHERE legacy.status='active'
      AND (legacy.enddate IS NULL OR legacy.enddate>=NOW())
  ) active_membership`;

export const scholarshipName = (levelId: unknown) => ({
  6: 'Docente',
  8: 'Familia estudiante',
  11: 'Personal CABSA',
}[Number(levelId)] ?? `Beca ${levelId}`);

export const secureHash = (value: string) => createHash('sha256')
  .update(`${value}:${env.jwtSecret}`)
  .digest('hex');

export const windowStart = (now: Date, milliseconds: number) =>
  new Date(Math.floor(now.getTime() / milliseconds) * milliseconds);

export const duplicateEntry = (error: unknown) => {
  const candidate = error as { name?: string; original?: { code?: string }; parent?: { code?: string } };
  return candidate?.name === 'SequelizeUniqueConstraintError'
    || candidate?.original?.code === 'ER_DUP_ENTRY'
    || candidate?.parent?.code === 'ER_DUP_ENTRY';
};

type TrackingResult = {
  saved: boolean;
  reason?: 'DUPLICATE' | 'RATE_LIMITED';
  retryAfterSeconds?: number;
};

export const guardedInsert = async (input: {
  category: 'platform' | 'ai';
  scopeHash: string;
  dedupeParts: Array<string | number | null>;
  dedupeSeconds: number;
  perMinute: number;
  rateLimitScopeHashes?: string[];
  insert: (transaction: Transaction, dedupeKey: string) => Promise<unknown>;
}): Promise<TrackingResult> => {
  const now = new Date();
  const minuteStart = windowStart(now, 60_000);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dedupeBucket = Math.floor(now.getTime() / (input.dedupeSeconds * 1000));
  const dedupeKey = secureHash([
    input.category, input.scopeHash, ...input.dedupeParts, dedupeBucket,
  ].map((value) => String(value ?? '')).join('|'));
  const rateScopes = [...new Set([input.scopeHash, ...(input.rateLimitScopeHashes ?? [])])];
  const limits = rateScopes.flatMap((rateScope) => [
    { scopeHash: secureHash(`${input.category}:minute:${rateScope}`), kind: 'MINUTE', start: minuteStart, limit: input.perMinute, retryAfterSeconds: 60 },
    { scopeHash: secureHash(`all:day:${rateScope}`), kind: 'DAY', start: dayStart, limit: env.tracking.eventsPerDay, retryAfterSeconds: 86_400 },
  ]);

  try {
    return await database.transaction(async (transaction) => {
      const locked: typeof limits = [];
      for (const limit of limits) {
        await database.query(
          `INSERT IGNORE INTO analitica_limites_eventos
            (scope_hash,window_kind,window_start,event_count,updated_at)
           VALUES (:scopeHash,:kind,:start,0,NOW())`,
          { replacements: limit, transaction },
        );
        const counters = await database.query<{ event_count: number | string }>(
          `SELECT event_count FROM analitica_limites_eventos
           WHERE scope_hash=:scopeHash AND window_kind=:kind AND window_start=:start
           FOR UPDATE`,
          { replacements: limit, type: QueryTypes.SELECT, transaction },
        );
        if (Number(counters[0]?.event_count ?? 0) >= limit.limit) {
          return { saved: false, reason: 'RATE_LIMITED', retryAfterSeconds: limit.retryAfterSeconds };
        }
        locked.push(limit);
      }
      for (const limit of locked) {
        await database.query(
          `UPDATE analitica_limites_eventos SET event_count=event_count+1,updated_at=NOW()
           WHERE scope_hash=:scopeHash AND window_kind=:kind AND window_start=:start`,
          { replacements: limit, transaction },
        );
      }
      await input.insert(transaction, dedupeKey);
      return { saved: true };
    });
  } catch (error) {
    if (duplicateEntry(error)) return { saved: false, reason: 'DUPLICATE' };
    throw error;
  }
};

export const streakForDates = (values: unknown[]) => {
  const dates = [...new Set(values.map(String))].sort().reverse();
  if (!dates.length) return { current: 0, best: 0, total: 0, last: null };
  let best = 1;
  let running = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const newer = new Date(`${dates[index - 1]}T00:00:00Z`);
    const older = new Date(`${dates[index]}T00:00:00Z`);
    const distance = Math.round((newer.getTime() - older.getTime()) / 86400000);
    if (distance === 1) running += 1;
    else running = 1;
    best = Math.max(best, running);
  }
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  const activeCurrent = dates[0] === todayKey || dates[0] === yesterday.toISOString().slice(0, 10);
  let current = activeCurrent ? 1 : 0;
  if (activeCurrent) {
    for (let index = 1; index < dates.length; index += 1) {
      const newer = new Date(`${dates[index - 1]}T00:00:00Z`);
      const older = new Date(`${dates[index]}T00:00:00Z`);
      if (Math.round((newer.getTime() - older.getTime()) / 86400000) !== 1) break;
      current += 1;
    }
  }
  return { current, best, total: dates.length, last: dates[0] };
};
