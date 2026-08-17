import database from '#config/database';
import env from '#config/env';
import { activeMembershipsSql, first, guardedInsert, membershipCondition, membershipFilter, normalizedNumber, range, rows, scholarshipName, secureHash, streakForDates, type Row, type TrackerFilters } from './trackers-query-context.js';

export class AiTrackersRepository {
  async recordPlatformEvent(input: {
    eventType: 'PAGE_VIEW' | 'CLICK';
    section: string;
    action: string | null;
    path: string;
    accountId: string | null;
    roleCode: string | null;
    sessionId: string;
    ip: string;
    device: 'desktop' | 'tablet' | 'mobile';
  }) {
    const sessionHash = secureHash(input.sessionId);
    const ipHash = secureHash(input.ip || 'unknown');
    const scopeHash = secureHash(input.accountId ? `account:${input.accountId}` : `session:${sessionHash}`);
    const dedupeSeconds = input.eventType === 'PAGE_VIEW'
      ? env.tracking.pageViewDedupeSeconds
      : env.tracking.clickDedupeSeconds;
    return guardedInsert({
      category: 'platform',
      scopeHash,
      dedupeParts: [input.eventType, input.section, input.path, input.action],
      dedupeSeconds,
      perMinute: env.tracking.platformPerMinute,
      rateLimitScopeHashes: input.accountId ? [] : [secureHash(`ip:${ipHash}`)],
      insert: (transaction, dedupeKey) => database.query(
        `INSERT INTO analitica_eventos_plataforma
          (event_type,section,action,path,account_id,role_code,session_hash,ip_hash,device,dedupe_key,created_at)
         VALUES (:eventType,:section,:action,:path,:accountId,:roleCode,:sessionHash,:ipHash,:device,:dedupeKey,NOW())`,
        { replacements: { ...input, sessionHash, ipHash, dedupeKey }, transaction },
      ),
    });
  }

  async recordAiEvent(input: {
    eventType: string;
    area: string;
    level: string;
    agentKey: string;
    agentTitle: string;
    provider: string | null;
    cardIndex: number;
    pageUrl: string | null;
    referrer: string | null;
    accountId: string | null;
    sessionId: string;
    ip: string;
    userAgent: string;
    device: string;
    viewport: string;
  }) {
    let legacyUserId = 0;
    if (input.accountId) {
      const account = await first<{ legacy_wp_user_id?: number }>(
        'SELECT legacy_wp_user_id FROM usuarios_cuentas WHERE id = :accountId LIMIT 1',
        { accountId: input.accountId },
      );
      legacyUserId = normalizedNumber(account.legacy_wp_user_id);
    }
    const now = new Date();
    const sessionHash = secureHash(input.sessionId);
    const scopeHash = secureHash(input.accountId ? `account:${input.accountId}` : `session:${sessionHash}`);
    const dedupeSeconds = input.eventType === 'click'
      ? env.tracking.clickDedupeSeconds
      : input.eventType === 'impression'
        ? env.tracking.impressionDedupeSeconds
        : env.tracking.pageViewDedupeSeconds;
    return guardedInsert({
      category: 'ai',
      scopeHash,
      dedupeParts: [input.eventType, input.area, input.level, input.agentKey, input.provider],
      dedupeSeconds,
      perMinute: env.tracking.aiPerMinute,
      insert: (transaction, dedupeKey) => database.query(
        `INSERT INTO analitica_eventos_asistentes_ia
          (event_type, area, level_slug, agent_key, agent_title, provider,
           card_index, page_id, page_url, referrer, user_id, account_id,
           session_hash, dedupe_key, ip_hash, user_agent, device, viewport, created_at)
         VALUES
          (:eventType, :area, :level, :agentKey, :agentTitle, :provider,
           :cardIndex, 0, :pageUrl, :referrer, :legacyUserId, :accountId,
           :sessionHash, :dedupeKey, :ipHash, :userAgent, :device, :viewport, :now)`,
        {
          replacements: {
            ...input,
            legacyUserId,
            sessionHash,
            dedupeKey,
            ipHash: input.ip ? secureHash(input.ip) : ''.padEnd(64, '0'),
            now,
          },
          transaction,
        },
      ),
    });
  }

  async ai(filters: TrackerFilters) {
    const dateRange = range(filters, 'e.created_at');
    const clauses = [dateRange.sql];
    const values: Record<string, unknown> = {
      ...dateRange.values,
      scholarshipLevel: filters.scholarshipLevel || 0,
    };
    if (filters.area) { clauses.push('e.area = :area'); values.area = filters.area; }
    if (filters.level) { clauses.push('e.level_slug = :level'); values.level = filters.level; }
    if (filters.event) { clauses.push('e.event_type = :event'); values.event = filters.event; }
    const baseWhere = clauses.join(' AND ');
    if (filters.scholarshipLevel) {
      clauses.push(membershipCondition(
        filters,
        'COALESCE(e.account_id,(SELECT membership_account.id FROM usuarios_cuentas membership_account WHERE membership_account.legacy_wp_user_id=e.user_id LIMIT 1))',
        'COALESCE(NULLIF(e.user_id,0),(SELECT membership_account.legacy_wp_user_id FROM usuarios_cuentas membership_account WHERE membership_account.id=e.account_id LIMIT 1))',
      ));
    }
    const where = clauses.join(' AND ');
    const [statsRow, topAgents, byArea, byLevel, byProvider, daily, recent, users, byScholarship] = await Promise.all([
      first<Row>(
        `SELECT COUNT(*) events, COUNT(DISTINCT e.session_hash) people,
          COUNT(DISTINCT COALESCE(e.account_id, NULLIF(CONCAT('legacy-',e.user_id),'legacy-0'))) users,
          SUM(e.event_type='click') clicks, SUM(e.event_type='impression') impressions,
          SUM(e.event_type='page_view') page_views
         FROM analitica_eventos_asistentes_ia e WHERE ${where}`,
        values,
      ),
      rows<Row>(
        `SELECT e.agent_key, MAX(e.agent_title) agent_title, e.area, e.level_slug,
          SUM(e.event_type='click') clicks, SUM(e.event_type='impression') impressions,
          COUNT(DISTINCT e.session_hash) people, MAX(e.created_at) last_event
         FROM analitica_eventos_asistentes_ia e WHERE ${where}
           AND e.area IN ('asistente','tutor')
         GROUP BY e.agent_key,e.area,e.level_slug
         ORDER BY clicks DESC, impressions DESC, people DESC LIMIT 100`,
        values,
      ),
      rows<Row>(
        `SELECT e.area, COUNT(*) events, SUM(e.event_type='click') clicks,
          SUM(e.event_type='impression') impressions, COUNT(DISTINCT e.session_hash) people
         FROM analitica_eventos_asistentes_ia e WHERE ${where}
         GROUP BY e.area ORDER BY events DESC`,
        values,
      ),
      rows<Row>(
        `SELECT e.level_slug level, COUNT(*) events, SUM(e.event_type='click') clicks,
          SUM(e.event_type='impression') impressions, COUNT(DISTINCT e.session_hash) people
         FROM analitica_eventos_asistentes_ia e WHERE ${where}
         GROUP BY e.level_slug ORDER BY events DESC`,
        values,
      ),
      rows<Row>(
        `SELECT COALESCE(e.provider,'sin_proveedor') provider, COUNT(*) clicks
         FROM analitica_eventos_asistentes_ia e
         WHERE ${where} AND e.event_type='click'
         GROUP BY e.provider ORDER BY clicks DESC`,
        values,
      ),
      rows<Row>(
        `SELECT DATE(e.created_at) date, COUNT(*) events,
          SUM(e.event_type='click') clicks, COUNT(DISTINCT e.session_hash) people
         FROM analitica_eventos_asistentes_ia e WHERE ${where}
         GROUP BY DATE(e.created_at) ORDER BY date ASC`,
        values,
      ),
      rows<Row>(
        `SELECT e.id,e.created_at,e.event_type,e.area,e.level_slug,e.agent_title,
          e.agent_key,e.provider,e.device,e.viewport,e.page_url,
          COALESCE(u.display_name,CONCAT('Visitante ',LEFT(e.session_hash,7))) display_name,u.email
         FROM analitica_eventos_asistentes_ia e
         LEFT JOIN usuarios_cuentas u ON u.id=e.account_id OR (e.account_id IS NULL AND u.legacy_wp_user_id=e.user_id)
         WHERE ${where} ORDER BY e.created_at DESC LIMIT 60`,
        values,
      ),
      rows<Row>(
        `SELECT COALESCE(u.id,CONCAT('legacy-',e.user_id)) user_id,
          COALESCE(u.display_name,CONCAT('Usuario #',e.user_id)) display_name,u.email,
          COUNT(*) events,SUM(e.event_type='click') clicks,
          COUNT(DISTINCT NULLIF(e.agent_key,'')) agents,MAX(e.created_at) last_event
         FROM analitica_eventos_asistentes_ia e
         LEFT JOIN usuarios_cuentas u ON u.id=e.account_id OR (e.account_id IS NULL AND u.legacy_wp_user_id=e.user_id)
         WHERE ${where} AND (e.account_id IS NOT NULL OR e.user_id>0)
         GROUP BY user_id,display_name,u.email ORDER BY clicks DESC,events DESC LIMIT 30`,
        values,
      ),
      rows<Row>(
        `SELECT membership.level_id,COUNT(*) interactions,
          COUNT(DISTINCT membership.user_id) users,
          SUM(e.event_type='click') clicks,SUM(e.event_type='impression') impressions
         FROM analitica_eventos_asistentes_ia e
         INNER JOIN (${activeMembershipsSql}) membership
           ON membership.user_id=COALESCE(e.account_id,
             (SELECT membership_account.id FROM usuarios_cuentas membership_account
              WHERE membership_account.legacy_wp_user_id=e.user_id LIMIT 1))
         WHERE ${baseWhere}
         GROUP BY membership.level_id ORDER BY membership.level_id`,
        values,
      ),
    ]);
    const stats = Object.fromEntries(Object.entries(statsRow).map(([key, value]) => [key, normalizedNumber(value)]));
    stats.ctr = stats.impressions ? Math.round((stats.clicks / stats.impressions) * 1000) / 10 : 0;
    stats.clicks_per_person = stats.people ? Math.round((stats.clicks / stats.people) * 10) / 10 : 0;
    return {
      period: { from: filters.from, to: filters.to }, stats, topAgents, byArea, byLevel,
      byProvider, daily, recent, users,
      byScholarship: byScholarship.map((row) => ({ ...row, name: scholarshipName(row.level_id) })),
    };
  }

}
