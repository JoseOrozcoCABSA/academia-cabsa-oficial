/**
 * @file Acceso a datos de los tickets de soporte.
 *
 * Trabaja sobre tablas heredadas (`cabsa_soporte_*`) cuyos tickets no siempre
 * tienen `user_id`, de ahí que la pertenencia se resuelva por tres vías.
 *
 * @see services/support.service.ts Reglas de negocio.
 */

import { Op, type Transaction, type WhereOptions } from 'sequelize';
import CabsaSoporteAdjuntos from '#models/CabsaSoporteAdjuntos';
import CabsaSoporteTickets from '#models/CabsaSoporteTickets';

/**
 * Identidad del solicitante, con las tres claves por las que se puede
 * reconciliar un ticket. Basta que una coincida.
 */
export interface SupportIdentity {
  subject: string;
  email: string;
  username: string;
}

/** Datos para insertar un ticket. Los campos de usuario admiten `null` por los datos heredados. */
export interface SupportTicketInput {
  folio: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  username: string | null;
  topic: string;
  subject: string;
  message: string;
  now: Date;
}

/**
 * Datos de un adjunto ya escrito en disco.
 *
 * `storedName` es el nombre con el que se guardó, y `originalName` el que subió
 * el usuario: son distintos y sólo el segundo se le muestra.
 */
export interface SupportAttachmentInput {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/** Consultas de soporte. */
export class SupportRepository {
  /**
   * Construye la condicion de pertenencia de un ticket.
   *
   * Combina con `OR` las tres formas de identificar al solicitante, porque los
   * tickets heredados no siempre tienen `user_id`: algunos solo se reconcilian
   * por correo o por nombre de usuario.
   *
   * El `user_id` se anade unicamente si el asunto del token es numerico; los
   * identificadores nuevos son UUID y no encajan en esa columna.
   *
   * Cuidado: si la identidad no aportara ninguno de los tres, el `OR` quedaria
   * vacio y Sequelize lo traduce a una condicion que **no filtra nada**. Quien
   * llama debe garantizar al menos un identificador, y el controlador lo hace
   * exigiendolo con un 401.
   */
  private ownerWhere(identity: SupportIdentity): WhereOptions {
    const owners: WhereOptions[] = [];
    if (identity.email) owners.push({ correo: identity.email });
    if (identity.username) owners.push({ usuario_login: identity.username });
    if (/^\d+$/.test(identity.subject)) owners.push({ user_id: identity.subject });
    return { [Op.or]: owners };
  }

  /** Tickets que pertenezcan al solicitante por cualquiera de sus tres identificadores. */
  async list(identity: SupportIdentity) {
    const ticketModels = await CabsaSoporteTickets.findAll({
      where: this.ownerWhere(identity),
      order: [['creado_en', 'DESC']],
      limit: 50,
    });

    // Los adjuntos se traen en una segunda consulta por lote en lugar de con un
    // JOIN, para no repetir los datos del ticket en cada fila. Si no hay
    // tickets se omite la consulta: un `IN ()` vacio es un error de SQL.
    const ticketIds = ticketModels.map((ticket) => ticket.get('id'));
    const attachmentModels = ticketIds.length
      ? await CabsaSoporteAdjuntos.findAll({
        where: { ticket_id: { [Op.in]: ticketIds } },
        order: [['creado_en', 'ASC']],
      })
      : [];

    const attachments = new Map<string, Array<Record<string, unknown>>>();
    for (const attachment of attachmentModels) {
      const values = attachment.get({ plain: true }) as Record<string, unknown>;
      const ticketId = String(values.ticket_id);
      const items = attachments.get(ticketId) ?? [];
      items.push(values);
      attachments.set(ticketId, items);
    }

    return ticketModels.map((ticket) => {
      const values = ticket.get({ plain: true }) as Record<string, unknown>;
      return {
        ...values,
        attachments: attachments.get(String(values.id)) ?? [],
      };
    });
  }

  /** Inserta el ticket. Requiere transacción: va junto con sus adjuntos. */
  createTicket(input: SupportTicketInput, transaction: Transaction) {
    return CabsaSoporteTickets.create({
      folio: input.folio,
      user_id: input.userId,
      tipo_acceso: 'interno',
      nombre: input.name,
      correo: input.email,
      usuario_login: input.username,
      tema: input.topic,
      asunto: input.subject,
      descripcion: input.message,
      estado: 'nuevo',
      prioridad: 'normal',
      asignado_a: null,
      respuesta_admin: null,
      creado_en: input.now,
      actualizado_en: input.now,
      cerrado_en: null,
    }, { transaction });
  }

  /** Inserta los adjuntos del ticket en la misma transacción. */
  createAttachments(
    ticketId: string,
    userId: string | null,
    files: SupportAttachmentInput[],
    now: Date,
    transaction: Transaction,
  ) {
    if (!files.length) return Promise.resolve([]);
    return CabsaSoporteAdjuntos.bulkCreate(files.map((file) => ({
      ticket_id: ticketId,
      user_id: userId,
      attachment_id: null,
      archivo_url: file.storedName,
      archivo_nombre: file.originalName,
      mime_type: file.mimeType,
      size_bytes: file.size,
      creado_en: now,
    })), { transaction });
  }

  /**
   * Devuelve el adjunto sólo si pertenece a un ticket del solicitante.
   *
   * Hace dos consultas: localiza el adjunto y después comprueba que su ticket
   * cumpla la condición de pertenencia. Es la comprobación de autorización que
   * evita que se descarguen evidencias de otros usuarios.
   *
   * @returns El adjunto, o `null` tanto si no existe como si no es suyo — no se
   *   distingue entre ambos casos a propósito.
   */
  async findOwnedAttachment(id: string, identity: SupportIdentity) {
    const attachment = await CabsaSoporteAdjuntos.findByPk(id);
    if (!attachment) return null;
    const ticketId = String(attachment.get('ticket_id'));
    const ticket = await CabsaSoporteTickets.findOne({
      where: {
        id: ticketId,
        ...this.ownerWhere(identity),
      },
    });
    return ticket ? attachment : null;
  }
}

/** Instancia única usada por el servicio. */
export default new SupportRepository();
