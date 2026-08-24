/** @file Contrato HTTP interno para comprobar una sesión. */
import type { Request, Response } from 'express';
import service from '#services/session-validation.service';

export default async function validateSession(request: Request, response: Response): Promise<void> {
  response.json({ valid: await service.validate(request.body ?? {}) });
}
