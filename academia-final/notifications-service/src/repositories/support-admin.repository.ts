import { QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';

export interface AdminTicketUpdate {
  status: string;
  priority: string;
  assignedUserId: string | null;
  reply: string | null;
  actorUserId: string;
  notify: boolean;
}

export class SupportAdminRepository {
  async dashboard(filters: { status?: string; priority?: string; search?: string; page: number; limit: number }) {
    const clauses: string[] = ['1=1'];
    const replacements: Record<string, unknown> = {
      offset: (filters.page - 1) * filters.limit,
      limit: filters.limit,
    };
    if (filters.status) {
      clauses.push('t.estado=:status');
      replacements.status = filters.status;
    }
    if (filters.priority) {
      clauses.push('t.prioridad=:priority');
      replacements.priority = filters.priority;
    }
    if (filters.search) {
      clauses.push(`(
        t.folio LIKE :search OR t.nombre LIKE :search OR t.correo LIKE :search
        OR t.usuario_login LIKE :search OR t.tema LIKE :search
        OR t.asunto LIKE :search OR t.descripcion LIKE :search
      )`);
      replacements.search = `%${filters.search}%`;
    }
    const where = clauses.join(' AND ');
    const [counts, tickets, totalRows, assignees] = await Promise.all([
      database.query<{
        total: number; nuevo: number; en_revision: number;
        en_proceso: number; respondido: number; cerrado: number;
      }>(
        `SELECT COUNT(*) total,
          SUM(estado='nuevo') nuevo,SUM(estado='en_revision') en_revision,
          SUM(estado='en_proceso') en_proceso,SUM(estado='respondido') respondido,
          SUM(estado='cerrado') cerrado
         FROM notificaciones_soporte_tickets`,
        { type: QueryTypes.SELECT },
      ),
      database.query<Record<string, unknown>>(
        `SELECT t.*,
          COALESCE(a.display_name,legacy.display_name) AS assigned_name,
          COALESCE(a.email,legacy.email) AS assigned_email
         FROM notificaciones_soporte_tickets t
         LEFT JOIN usuarios_cuentas a ON a.id=t.asignado_user_id
         LEFT JOIN usuarios_cuentas legacy ON legacy.legacy_wp_user_id=t.asignado_a
         WHERE ${where}
         ORDER BY t.creado_en DESC LIMIT :limit OFFSET :offset`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<{ total: number }>(
        `SELECT COUNT(*) total FROM notificaciones_soporte_tickets t WHERE ${where}`,
        { replacements, type: QueryTypes.SELECT },
      ),
      database.query<{ id: string; display_name: string; email: string }>(
        `SELECT id,display_name,email FROM usuarios_cuentas
         WHERE status='ACTIVE' ORDER BY display_name,email LIMIT 1000`,
        { type: QueryTypes.SELECT },
      ),
    ]);
    const ids = tickets.map((ticket) => Number(ticket.id));
    const [attachments, history] = ids.length
      ? await Promise.all([
        database.query<Record<string, unknown>>(
          `SELECT id,ticket_id,archivo_nombre,mime_type,size_bytes,creado_en
           FROM notificaciones_soporte_adjuntos
           WHERE ticket_id IN (:ids) ORDER BY creado_en`,
          { replacements: { ids }, type: QueryTypes.SELECT },
        ),
        database.query<Record<string, unknown>>(
          `SELECT h.*,u.display_name AS actor_name
           FROM notificaciones_soporte_seguimiento h
           LEFT JOIN usuarios_cuentas u ON u.id=h.actor_user_id
           WHERE h.ticket_id IN (:ids) ORDER BY h.creado_en DESC`,
          { replacements: { ids }, type: QueryTypes.SELECT },
        ),
      ])
      : [[], []];
    return {
      counts: counts[0] ?? { total: 0, nuevo: 0, en_revision: 0, en_proceso: 0, respondido: 0, cerrado: 0 },
      tickets: tickets.map((ticket) => ({
        ...ticket,
        attachments: attachments.filter((item) => Number(item.ticket_id) === Number(ticket.id)),
        history: history.filter((item) => Number(item.ticket_id) === Number(ticket.id)),
      })),
      assignees,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: Number(totalRows[0]?.total ?? 0),
        pages: Math.max(1, Math.ceil(Number(totalRows[0]?.total ?? 0) / filters.limit)),
      },
    };
  }

  transaction<T>(callback: (transaction: Transaction) => Promise<T>) {
    return database.transaction(callback);
  }

  async lockedTicket(id: number, transaction: Transaction) {
    const rows = await database.query<Record<string, unknown>>(
      'SELECT * FROM notificaciones_soporte_tickets WHERE id=:id LIMIT 1 FOR UPDATE',
      { replacements: { id }, type: QueryTypes.SELECT, transaction },
    );
    return rows[0] ?? null;
  }

  async assigneeExists(id: string, transaction: Transaction) {
    const rows = await database.query<{ id: string }>(
      `SELECT id FROM usuarios_cuentas WHERE id=:id AND status='ACTIVE' LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT, transaction },
    );
    return Boolean(rows[0]);
  }

  async updateTicket(id: number, previous: Record<string, unknown>, values: AdminTicketUpdate, transaction: Transaction) {
    await database.query(
      `UPDATE notificaciones_soporte_tickets
       SET estado=:status,prioridad=:priority,asignado_user_id=:assignedUserId,
           respuesta_admin=:reply,actualizado_en=NOW(),
           cerrado_en=CASE WHEN :status='cerrado' THEN COALESCE(cerrado_en,NOW()) ELSE NULL END
       WHERE id=:id`,
      { replacements: { id, ...values }, type: QueryTypes.UPDATE, transaction },
    );
    await database.query(
      `INSERT INTO notificaciones_soporte_seguimiento
       (ticket_id,actor_user_id,estado_anterior,estado_nuevo,prioridad_anterior,
        prioridad_nueva,asignado_anterior,asignado_nuevo,respuesta,
        notificacion_solicitada,notificacion_enviada,creado_en)
       VALUES (:id,:actorUserId,:previousStatus,:status,:previousPriority,
        :priority,:previousAssignee,:assignedUserId,:reply,:notify,0,NOW())`,
      {
        replacements: {
          id,
          ...values,
          previousStatus: previous.estado ?? null,
          previousPriority: previous.prioridad ?? null,
          previousAssignee: previous.asignado_user_id ?? null,
          notify: values.notify ? 1 : 0,
        },
        transaction,
      },
    );
    const ids = await database.query<{ id: number }>(
      'SELECT LAST_INSERT_ID() id',
      { type: QueryTypes.SELECT, transaction },
    );
    return Number(ids[0]?.id);
  }

  async markNotification(ticketId: number, historyId: number) {
    await Promise.all([
      database.query(
        'UPDATE notificaciones_soporte_tickets SET notificado_en=NOW() WHERE id=:ticketId',
        { replacements: { ticketId }, type: QueryTypes.UPDATE },
      ),
      database.query(
        'UPDATE notificaciones_soporte_seguimiento SET notificacion_enviada=1 WHERE id=:historyId',
        { replacements: { historyId }, type: QueryTypes.UPDATE },
      ),
    ]);
  }

  async attachment(id: number) {
    const rows = await database.query<Record<string, unknown>>(
      `SELECT id,archivo_url,archivo_nombre,mime_type,size_bytes
       FROM notificaciones_soporte_adjuntos WHERE id=:id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return rows[0] ?? null;
  }
}

export default new SupportAdminRepository();
