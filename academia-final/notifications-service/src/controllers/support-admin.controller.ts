import type { Request, Response } from 'express';
import service from '#services/support-admin.service';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';

const actorId = (request: Request): string => {
  const id = request.auth?.sub ?? request.auth?.subject;
  if (typeof id !== 'string' || !id.trim()) {
    throw new AppError('Administrador no identificado', 401, 'ADMIN_IDENTITY_REQUIRED');
  }
  return id;
};

export class SupportAdminController {
  dashboard = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.dashboard(request.query as Record<string, unknown>));
  };

  update = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.update(request.params.id, actorId(request), request.body));
  };

  attachment = async (request: Request, response: Response): Promise<void> => {
    const file = await service.attachment(request.params.id);
    response.type(file.mimeType);
    if (request.query.disposition === 'inline') {
      response.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      );
      response.sendFile(file.filePath);
      return;
    }
    response.download(file.filePath, file.fileName);
  };
}

export default new SupportAdminController();
