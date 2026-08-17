import fs from 'node:fs/promises';
import path from 'node:path';
import repository from '#repositories/support-admin.repository';
import { AppError } from '#utils/errors';
import { sendMail, supportReplyMail } from '#services/mailer.service';
import { supportStorageRoot } from '#middlewares/supportUpload.middleware';

const statuses = new Set(['nuevo', 'en_revision', 'en_proceso', 'respondido', 'cerrado']);
const priorities = new Set(['baja', 'normal', 'alta', 'urgente']);
const statusLabels: Record<string, string> = {
  nuevo: 'Nuevo', en_revision: 'En revisión', en_proceso: 'En proceso',
  respondido: 'Respondido', cerrado: 'Cerrado',
};
const priorityLabels: Record<string, string> = {
  baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente',
};

export class SupportAdminService {
  dashboard(query: Record<string, unknown>) {
    const status = String(query.status ?? '').trim();
    const priority = String(query.priority ?? '').trim();
    if (status && !statuses.has(status)) throw new AppError('Estado inválido', 400, 'INVALID_SUPPORT_STATUS');
    if (priority && !priorities.has(priority)) throw new AppError('Prioridad inválida', 400, 'INVALID_SUPPORT_PRIORITY');
    return repository.dashboard({
      status,
      priority,
      search: String(query.search ?? '').trim().slice(0, 190),
      page: Math.max(1, Number(query.page) || 1),
      limit: Math.min(100, Math.max(1, Number(query.limit) || 30)),
    });
  }

  async update(ticketIdValue: unknown, actorUserId: string, body: Record<string, unknown>) {
    const ticketId = Number(ticketIdValue);
    const status = String(body.status ?? '');
    const priority = String(body.priority ?? '');
    const assignedUserId = String(body.assignedUserId ?? '').trim() || null;
    const reply = String(body.reply ?? '').trim() || null;
    const notify = body.notify === true;
    if (!ticketId || !statuses.has(status) || !priorities.has(priority)) {
      throw new AppError('Datos de actualización inválidos', 400, 'INVALID_SUPPORT_UPDATE');
    }
    if (reply && reply.length > 10_000) {
      throw new AppError('La respuesta admite hasta 10,000 caracteres', 400, 'SUPPORT_REPLY_TOO_LONG');
    }
    if (notify && !reply) {
      throw new AppError('Escribe una respuesta antes de notificar al usuario', 400, 'SUPPORT_REPLY_REQUIRED');
    }
    const result = await repository.transaction(async (transaction) => {
      const ticket = await repository.lockedTicket(ticketId, transaction);
      if (!ticket) throw new AppError('Petición no encontrada', 404, 'SUPPORT_TICKET_NOT_FOUND');
      if (assignedUserId && !await repository.assigneeExists(assignedUserId, transaction)) {
        throw new AppError('El responsable seleccionado no está disponible', 422, 'SUPPORT_ASSIGNEE_INVALID');
      }
      const historyId = await repository.updateTicket(ticketId, ticket, {
        status, priority, assignedUserId, reply, actorUserId, notify,
      }, transaction);
      return { ticket, historyId };
    });
    let emailSent = false;
    let emailError: string | null = null;
    if (notify) {
      const email = String(result.ticket.correo ?? '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError = 'La petición no tiene un correo válido.';
      } else {
        try {
          await sendMail(supportReplyMail(
            email,
            String(result.ticket.nombre ?? 'usuario'),
            String(result.ticket.folio),
            statusLabels[status],
            priorityLabels[priority],
            reply ?? '',
          ));
          emailSent = true;
          await repository.markNotification(ticketId, result.historyId);
        } catch {
          emailError = 'Los cambios se guardaron, pero el correo no pudo enviarse.';
        }
      }
    }
    return {
      updated: true,
      emailRequested: notify,
      emailSent,
      emailError,
      message: emailSent
        ? 'Petición actualizada y usuario notificado por correo.'
        : emailError ?? 'Petición actualizada correctamente.',
    };
  }

  async attachment(idValue: unknown) {
    const id = Number(idValue);
    if (!id) throw new AppError('Adjunto inválido', 400, 'INVALID_ATTACHMENT');
    const attachment = await repository.attachment(id);
    if (!attachment) throw new AppError('Adjunto no encontrado', 404, 'ATTACHMENT_NOT_FOUND');
    const filePath = path.resolve(supportStorageRoot, String(attachment.archivo_url));
    if (!filePath.startsWith(`${supportStorageRoot}${path.sep}`)) {
      throw new AppError('Ruta de adjunto inválida', 400, 'INVALID_ATTACHMENT_PATH');
    }
    try { await fs.access(filePath); } catch {
      throw new AppError('El archivo ya no está disponible', 404, 'ATTACHMENT_FILE_MISSING');
    }
    return {
      filePath,
      fileName: String(attachment.archivo_nombre || 'evidencia'),
      mimeType: String(attachment.mime_type || 'application/octet-stream'),
    };
  }
}

export default new SupportAdminService();
