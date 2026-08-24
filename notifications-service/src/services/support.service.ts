/**
 * @file Reglas de negocio de los tickets de soporte.
 *
 * @see repositories/support.repository.ts Acceso a datos.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import database from '#config/database';
import repository, {
  type SupportAttachmentInput,
  type SupportIdentity,
} from '#repositories/support.repository';
import { supportStorageRoot } from '#middlewares/supportUpload.middleware';
import { AppError } from '#utils/errors';

/**
 * Temas admitidos, en lista blanca.
 *
 * Los valores son literales en español con acentos y deben coincidir
 * **exactamente** con los que envía el frontend. Cambiar una etiqueta aquí
 * rompe el formulario mientras no se cambie también allí.
 */
const allowedTopics = new Set([
  'Acceso y cuenta',
  'Cursos y lecciones',
  'Cápsulas y gamificación',
  'Otro',
]);

/** Recorta el texto; devuelve vacío si no es una cadena. */
const cleanText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Reduce el estado del ticket a abierto o cerrado.
 *
 * Reconoce `cerrado` y `closed` sin distinguir mayúsculas porque los datos
 * heredados guardan el estado en ambos idiomas. **Cualquier otro valor cuenta
 * como abierto**, incluido uno desconocido, de modo que un estado nuevo no
 * desaparece de la vista.
 */
const statusGroup = (status: unknown): 'open' | 'closed' =>
  ['cerrado', 'closed'].includes(String(status).toLowerCase())
    ? 'closed'
    : 'open';

const matchesImageSignature = (mimeType: string, bytes: Buffer): boolean => {
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/gif') {
    return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'));
  }
  if (mimeType === 'image/webp') {
    return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
};

/** Servicio de soporte. */
export class SupportService {
  /** Tickets del solicitante, separados en abiertos y cerrados. */
  async list(identity: SupportIdentity) {
    const tickets = await repository.list(identity);
    return {
      tickets,
      counts: {
        total: tickets.length,
        open: tickets.filter((ticket) => (
          statusGroup((ticket as Record<string, unknown>).estado) === 'open'
        )).length,
        closed: tickets.filter((ticket) => (
          statusGroup((ticket as Record<string, unknown>).estado) === 'closed'
        )).length,
      },
    };
  }

  /**
   * Crea el ticket, valida el tema y registra los adjuntos.
   *
   * El tema debe estar en la lista blanca; el asunto y el mensaje se recortan.
   * Ticket y adjuntos se guardan en una transacción, así que no quedan adjuntos
   * sueltos si algo falla.
   *
   * Los archivos ya están escritos en disco por el middleware de subida antes
   * de llegar aquí, así que cada camino de fallo —validación o reversión de la
   * transacción— los borra con {@link SupportService.removeUploadedFiles}. Sin
   * eso quedarían archivos huérfanos sin fila que los referencie.
   */
  async create(
    identity: SupportIdentity,
    body: Record<string, unknown>,
    uploadedFiles: Express.Multer.File[],
  ) {
    const topic = cleanText(body.topic);
    const subject = cleanText(body.subject);
    const message = cleanText(body.message);
    const name = cleanText(body.name);

    for (const file of uploadedFiles) {
      const bytes = await fs.readFile(file.path);
      if (!matchesImageSignature(file.mimetype, bytes)) {
        await this.removeUploadedFiles(uploadedFiles);
        throw new AppError(
          'El contenido del adjunto no coincide con un formato de imagen permitido.',
          400,
          'INVALID_ATTACHMENT_CONTENT',
        );
      }
    }

    if (!allowedTopics.has(topic)) {
      await this.removeUploadedFiles(uploadedFiles);
      throw new AppError('Selecciona un tema válido.', 400, 'INVALID_TOPIC');
    }
    if (!subject || subject.length > 255) {
      await this.removeUploadedFiles(uploadedFiles);
      throw new AppError('El asunto es obligatorio y admite hasta 255 caracteres.', 400, 'INVALID_SUBJECT');
    }
    if (message.length < 10 || message.length > 5000) {
      await this.removeUploadedFiles(uploadedFiles);
      throw new AppError('La descripción debe contener entre 10 y 5000 caracteres.', 400, 'INVALID_MESSAGE');
    }

    const now = new Date();
    const userId = /^\d+$/.test(identity.subject) ? identity.subject : null;
    const folio = `CABSA-SOP-${this.datePart(now)}-${randomUUID().slice(0, 6).toUpperCase()}`;
    // Se separa el nombre con el que se guardo el archivo del que subio el
    // usuario: solo el segundo se le muestra, y el primero es el que existe en
    // disco.
    const files: SupportAttachmentInput[] = uploadedFiles.map((file) => ({
      storedName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    try {
      // Ticket y adjuntos, o ninguno de los dos: un adjunto sin ticket no
      // seria accesible ni borrable desde la aplicacion.
      const ticket = await database.transaction(async (transaction) => {
        const created = await repository.createTicket({
          folio,
          userId,
          name: name || null,
          email: identity.email || null,
          username: identity.username || null,
          topic,
          subject,
          message,
          now,
        }, transaction);
        await repository.createAttachments(
          String(created.get('id')),
          userId,
          files,
          now,
          transaction,
        );
        return created;
      });

      return {
        ticket: ticket.get({ plain: true }),
        message: `Tu solicitud fue enviada correctamente. Folio: ${folio}`,
      };
    } catch (error) {
      await this.removeUploadedFiles(uploadedFiles);
      throw error;
    }
  }

  /**
   * Resuelve la ruta física de un adjunto, comprobando permiso y ruta.
   *
   * Dos comprobaciones, en este orden:
   * 1. El adjunto debe pertenecer a un ticket del solicitante; si no, 404.
   * 2. La ruta resuelta debe quedar **dentro** del directorio de soporte. Es la
   *    defensa contra travesía de rutas: aunque el nombre guardado en la base de
   *    datos contuviera `../`, `path.resolve` lo normaliza y la comprobación de
   *    prefijo lo detecta.
   *
   * Además verifica que el archivo siga existiendo, para distinguir un adjunto
   * borrado del disco de uno inexistente.
   *
   * @returns `{ filePath, fileName, mimeType }` listo para `response.download`.
   * @throws {AppError} 404 `ATTACHMENT_NOT_FOUND` si no existe o no es suyo; 400
   *   `INVALID_ATTACHMENT_PATH` si la ruta escapa del directorio; 404
   *   `ATTACHMENT_FILE_MISSING` si el registro existe pero el archivo no.
   */
  async attachment(id: string, identity: SupportIdentity) {
    const attachment = await repository.findOwnedAttachment(id, identity);
    if (!attachment) {
      throw new AppError('Adjunto no encontrado.', 404, 'ATTACHMENT_NOT_FOUND');
    }
    const storedName = String(attachment.get('archivo_url'));
    const filePath = path.resolve(supportStorageRoot, storedName);
    if (!filePath.startsWith(`${supportStorageRoot}${path.sep}`)) {
      throw new AppError('Ruta de adjunto inválida.', 400, 'INVALID_ATTACHMENT_PATH');
    }
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError('El archivo adjunto ya no está disponible.', 404, 'ATTACHMENT_FILE_MISSING');
    }
    return {
      filePath,
      fileName: String(attachment.get('archivo_nombre') || 'evidencia'),
      mimeType: String(attachment.get('mime_type') || 'application/octet-stream'),
    };
  }

  /**
   * Fecha en formato `AAAAMMDD` para el folio.
   *
   * Usa la hora local del servidor, no UTC, asi que el dia del folio cambia a
   * la medianoche del servidor.
   */
  private datePart(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Borra del disco los archivos ya subidos.
   *
   * Se llama en todos los caminos de fallo, porque el middleware de subida
   * escribe los archivos antes de que se valide nada.
   *
   * Los errores de borrado se descartan a proposito: si el archivo ya no esta,
   * el objetivo se cumplio igual, y no tiene sentido ocultar el error real que
   * provoco la limpieza.
   */
  private async removeUploadedFiles(files: Express.Multer.File[]) {
    await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)));
  }
}

/** Instancia de `SupportService` lista para usar. */
export default new SupportService();
