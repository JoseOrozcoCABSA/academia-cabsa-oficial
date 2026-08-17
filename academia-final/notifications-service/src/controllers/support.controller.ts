/**
 * @file Capa HTTP de los tickets de soporte.
 *
 * Todo se resuelve contra la identidad del token: no se acepta un id de usuario
 * por parámetro, así que nadie puede listar ni descargar los tickets de otro.
 *
 * @see services/support.service.ts Reglas de negocio.
 */

import type { Request, Response } from 'express';
import service from '#services/support.service';
import type { SupportIdentity } from '#repositories/support.repository';
import { ok } from '#utils/response';
import { AppError } from '#utils/errors';

/** Normaliza un dato del token: cadena recortada, o vacío si no lo es. */
const claim = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Arma la identidad del solicitante a partir del token.
 *
 * Recoge los tres identificadores disponibles —`sub`/`subject`, correo y
 * usuario— porque los tickets heredados no siempre tienen `user_id`: algunos
 * sólo se pueden reconciliar por correo o por nombre de usuario. El correo se
 * pasa a minúsculas para que la comparación sea estable.
 *
 * Basta con que **uno** de los tres esté presente.
 *
 * @throws {AppError} 401 `USER_IDENTITY_REQUIRED` si el token no identifica a
 *   nadie, que es lo que ocurre si la ruta se monta sin `authMiddleware`.
 */
const identityFrom = (request: Request): SupportIdentity => {
  const identity = {
    subject: claim(request.auth?.sub ?? request.auth?.subject),
    email: claim(request.auth?.email).toLowerCase(),
    username: claim(request.auth?.username),
  };
  if (!identity.subject && !identity.email && !identity.username) {
    throw new AppError('No fue posible identificar al usuario.', 401, 'USER_IDENTITY_REQUIRED');
  }
  return identity;
};

/** Manejadores de soporte. */
export class SupportController {
  /** `GET /support` — Tickets del solicitante, agrupados en abiertos y cerrados. */
  list = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.list(identityFrom(request)));
  };

  /**
   * `POST /support` — Crea un ticket con sus archivos de evidencia.
   *
   * Espera `multipart/form-data`. Si `request.files` no es un arreglo —porque no
   * se montó el middleware de subida múltiple— continúa sin adjuntos en lugar de
   * fallar.
   *
   * @returns 201 con el ticket creado y su folio.
   */
  create = async (request: Request, response: Response): Promise<void> => {
    const files = Array.isArray(request.files)
      ? request.files as Express.Multer.File[]
      : [];
    ok(
      response,
      await service.create(
        identityFrom(request),
        request.body as Record<string, unknown>,
        files,
      ),
      201,
    );
  };

  /**
   * `GET /support/attachments/:id` — Descarga un adjunto.
   *
   * El servicio comprueba antes que el adjunto pertenezca a un ticket del
   * solicitante, así que un id ajeno responde 404 y no 403: no confirma que el
   * adjunto exista.
   *
   * Responde con `Content-Disposition` de descarga, usando el nombre original
   * del archivo y no el nombre con el que se guardó.
   */
  attachment = async (request: Request, response: Response): Promise<void> => {
    const id = Array.isArray(request.params.id)
      ? request.params.id[0]
      : request.params.id;
    const file = await service.attachment(id, identityFrom(request));
    response.type(file.mimeType);
    response.download(file.filePath, file.fileName);
  };
}

/** Instancia única lista para montar en las rutas. */
export default new SupportController();
