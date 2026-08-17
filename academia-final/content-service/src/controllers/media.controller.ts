import type { Request, Response } from 'express';
import service from '#services/media.service';
import { ok } from '#utils/response';
import env from '#config/env';

const baseUrl = (request: Request): string => {
  if (env.publicApiUrl) return env.publicApiUrl;
  const proto = request.header('x-forwarded-proto') || request.protocol;
  const host = request.header('x-forwarded-host') || request.header('host') || 'localhost:6080';
  return `${proto}://${host}`;
};
const param = (request: Request, name: string): string => {
  const value = request.params[name];
  return Array.isArray(value) ? value[0] : value;
};

class MediaController {
  list = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.list(request.query as Record<string, unknown>, baseUrl(request)));
  };

  find = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.find(param(request, 'id'), baseUrl(request)));
  };

  upload = async (request: Request, response: Response): Promise<void> => {
    const subject = request.auth?.sub?.toString() || request.auth?.subject?.toString() || null;
    ok(response, await service.upload(
      request.file,
      request.body as Record<string, unknown>,
      subject,
      baseUrl(request),
    ), 201);
  };

  update = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.update(param(request, 'id'), request.body as Record<string, unknown>, baseUrl(request)));
  };

  file = async (request: Request, response: Response): Promise<void> => {
    const result = await service.file(param(request, 'id'), param(request, 'variant'));
    response.setHeader('Content-Type', result.mimeType);
    response.setHeader('Cache-Control', result.cacheControl);
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
    // Transmite por bloques y permite rangos; no carga videos completos al
    // heap del proceso.
    response.sendFile(result.filePath);
  };

  link = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.link(param(request, 'id'), request.body as Record<string, unknown>), 201);
  };

  unlink = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.unlink(param(request, 'relationId')));
  };

  remove = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.remove(param(request, 'id')));
  };
}

export default new MediaController();
