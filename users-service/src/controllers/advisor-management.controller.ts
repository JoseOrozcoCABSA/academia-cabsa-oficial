import type { Request, Response } from 'express';
import service from '#services/advisor-management.service';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';

const actor = (request: Request) => {
  const id = String(request.auth?.sub || '');
  if (!id) throw new AppError('SesiÃ³n invÃ¡lida', 401, 'INVALID_SESSION');
  return id;
};

export class AdvisorManagementController {
  list = async (request: Request, response: Response) => ok(response, await service.listAdvisors(actor(request)));
  create = async (request: Request, response: Response) => ok(response, await service.createAdvisor(actor(request), request.body), 201);
  setStatus = async (request: Request, response: Response) => ok(response, await service.setAdvisorStatus(actor(request), String(request.params.id), request.body.status));
  update = async (request: Request, response: Response) => ok(response, await service.updateAdvisor(actor(request), String(request.params.id), request.body));
  workspace = async (request: Request, response: Response) => ok(response, await service.workspace(actor(request), request.query.advisorId));
  createGroup = async (request: Request, response: Response) => ok(response, await service.createGroup(actor(request), request.body), 201);
  createUser = async (request: Request, response: Response) => ok(response, await service.createManagedUser(actor(request), request.body), 201);
  updateUser = async (request: Request, response: Response) => ok(response, await service.updateManagedUser(actor(request), String(request.params.id), request.body));
  setUserStatus = async (request: Request, response: Response) => ok(response, await service.setManagedUserStatus(actor(request), String(request.params.id), request.body.status, request.body.advisorId));
  profile = async (request: Request, response: Response) => ok(response, await service.getAdvisorProfile(actor(request)));
}

export default new AdvisorManagementController();
