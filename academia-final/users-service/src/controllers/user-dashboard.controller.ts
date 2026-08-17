import type { Request, Response } from 'express';
import repository from '#repositories/user-dashboard.repository';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';
import { hashPassword } from '#utils/password';

const id = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new AppError('Identificador inválido', 400, 'INVALID_ID');
  return parsed;
};
const text = (value: unknown, max = 255) => String(value ?? '').trim().slice(0, max);
const uuid = (value: unknown) => {
  const parsed = String(value || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed)) {
    throw new AppError('Identificador de cuenta inválido', 400, 'INVALID_ACCOUNT_ID');
  }
  return parsed;
};

export class UserDashboardController {
  overview = async (_request: Request, response: Response) => ok(response, await repository.overview());

  groupAnalytics = async (_request: Request, response: Response) => ok(response, await repository.groupAnalytics());

  accessMatrix = async (_request: Request, response: Response) => ok(response, await repository.accessMatrix());

  updateAccess = async (request: Request, response: Response) => {
    const levelId = id(request.params.levelId);
    if (!(await repository.membershipLevelExists(levelId))) throw new AppError('Tipo de beca no administrable', 400, 'INVALID_MEMBERSHIP_LEVEL');
    const sectionCode = text(request.params.sectionCode, 60);
    if (!['courses', 'lessons', 'media', 'assistants', 'tutors', 'forums', 'progress', 'support'].includes(sectionCode)) {
      throw new AppError('Sección de plataforma inválida', 400, 'INVALID_PLATFORM_SECTION');
    }
    if (typeof request.body.allowed !== 'boolean') throw new AppError('Indica si el acceso está permitido', 400, 'INVALID_ACCESS_VALUE');
    const updated = await repository.updateAccess(levelId, sectionCode, request.body.allowed, String(request.auth?.sub || '') || null);
    if (!updated) throw new AppError('Regla de acceso no encontrada', 404, 'ACCESS_RULE_NOT_FOUND');
    ok(response, { levelId, sectionCode, allowed: request.body.allowed });
  };

  resourceAccessRules = async (_request: Request, response: Response) => ok(response, await repository.resourceAccessRules());

  updateResourceAccess = async (request: Request, response: Response) => {
    const levelId = id(request.params.levelId);
    if (!(await repository.membershipLevelExists(levelId))) throw new AppError('Tipo de beca no administrable', 400, 'INVALID_MEMBERSHIP_LEVEL');
    const resourceType = text(request.params.resourceType, 40);
    if (!['course', 'capsule', 'forum', 'assistant_page', 'tutor_page'].includes(resourceType)) {
      throw new AppError('Tipo de recurso inválido', 400, 'INVALID_RESOURCE_TYPE');
    }
    const resourceKey = text(request.params.resourceKey, 190);
    if (!resourceKey) throw new AppError('Identificador de recurso requerido', 400, 'RESOURCE_KEY_REQUIRED');
    if (typeof request.body.allowed !== 'boolean') throw new AppError('Indica si el recurso está permitido', 400, 'INVALID_ACCESS_VALUE');
    ok(response, await repository.updateResourceAccess(levelId, resourceType, resourceKey, request.body.allowed, String(request.auth?.sub || '') || null));
  };

  updateAccount = async (request: Request, response: Response) => {
    const email = text(request.body.email, 190).toLowerCase();
    const username = text(request.body.username, 100).toLowerCase();
    const status = text(request.body.status, 20).toUpperCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Correo inválido', 400, 'INVALID_EMAIL');
    }
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      throw new AppError('El usuario debe tener entre 3 y 40 caracteres válidos', 400, 'INVALID_USERNAME');
    }
    if (!['PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED'].includes(status)) {
      throw new AppError('Estado de cuenta inválido', 400, 'INVALID_STATUS');
    }
    const password = String(request.body.password || '');
    const passwordConfirmation = String(request.body.passwordConfirmation || '');
    if (password && (password.length < 8 || password !== passwordConfirmation)) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres y coincidir', 400, 'INVALID_PASSWORD');
    }
    const scholarshipLevel = request.body.scholarshipLevel === '' || request.body.scholarshipLevel == null
      ? null : id(request.body.scholarshipLevel);
    if (scholarshipLevel && !(await repository.membershipLevelExists(scholarshipLevel))) {
      throw new AppError('El tipo de beca seleccionado no existe', 400, 'INVALID_MEMBERSHIP_LEVEL');
    }
    const result = await repository.updateAccount(uuid(request.params.id), {
      email,
      username,
      status,
      displayName: text(request.body.displayName, 255),
      firstName: text(request.body.firstName, 120),
      lastName: text(request.body.lastName, 160),
      phone: text(request.body.phone, 30),
      passwordHash: password ? await hashPassword(password) : null,
      scholarshipLevel,
      actorId: String(request.auth?.sub || ''),
    });
    if (!result) throw new AppError('Cuenta no encontrada', 404, 'ACCOUNT_NOT_FOUND');
    ok(response, result);
  };

  updateOfficial = async (request: Request, response: Response) => {
    const email = text(request.body.email, 190).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Correo inválido', 400, 'INVALID_EMAIL');
    }
    const accountStatus = text(request.body.accountStatus);
    if (accountStatus && !['activo', 'inactivo'].includes(accountStatus)) {
      throw new AppError('Estado de cuenta inválido', 400, 'INVALID_STATUS');
    }
    const result = await repository.updateOfficial(id(request.params.id), {
      email: email || undefined,
      displayName: text(request.body.displayName) || undefined,
      firstName: text(request.body.firstName, 190),
      lastName: text(request.body.lastName, 190),
      rfc: text(request.body.rfc, 20).toUpperCase().replace(/[^A-Z0-9&Ñ]/g, ''),
      region: text(request.body.region, 190),
      coordinator: text(request.body.coordinator, 190),
      municipality: text(request.body.municipality, 190),
      state: text(request.body.state, 190),
      stateCode: text(request.body.stateCode, 2),
      municipalityCode: text(request.body.municipalityCode, 3),
      postalCode: text(request.body.postalCode, 5).replace(/\D/g, ''),
      neighborhood: text(request.body.neighborhood, 190),
      accountStatus: accountStatus || undefined,
    });
    if (!result) throw new AppError('Usuario oficial no encontrado', 404, 'OFFICIAL_USER_NOT_FOUND');
    ok(response, result);
  };

  createGroup = async (request: Request, response: Response) => {
    const name = text(request.body.name, 190);
    if (!name) throw new AppError('Escribe el nombre del grupo', 400, 'GROUP_NAME_REQUIRED');
    ok(response, await repository.createGroup({
      name,
      description: text(request.body.description, 2000),
      actorId: String(request.auth?.sub || '') || null,
    }), 201);
  };

  updateGroup = async (request: Request, response: Response) => {
    const values = {
      name: text(request.body.name, 190) || null,
      description: request.body.description === undefined ? null : text(request.body.description, 2000),
      state: text(request.body.state, 190) || null,
      stateCode: text(request.body.stateCode, 2) || null,
      municipality: text(request.body.municipality, 190) || null,
      municipalityCode: text(request.body.municipalityCode, 3) || null,
    };
    const updated = await repository.updateGroup(id(request.params.id), values);
    if (!updated) throw new AppError('Grupo no encontrado o sin cambios', 404, 'GROUP_NOT_FOUND');
    ok(response, { updated: true });
  };

  removeGroup = async (request: Request, response: Response) => {
    const result = await repository.removeGroup(id(request.params.id));
    if (result.blocked) throw new AppError(
      `El grupo conserva ${result.members} miembros y ${result.rosters} carga(s) de padrón`,
      409,
      'GROUP_HAS_HISTORY',
    );
    if (!result.deleted) throw new AppError('Grupo no encontrado', 404, 'GROUP_NOT_FOUND');
    ok(response, result);
  };

  assignGroup = async (request: Request, response: Response) => {
    const result = await repository.assignGroup(id(request.params.id), id(request.params.groupId));
    if (!result) throw new AppError('Usuario no encontrado', 404, 'OFFICIAL_USER_NOT_FOUND');
    ok(response, result);
  };

  removeFromGroup = async (request: Request, response: Response) => {
    ok(response, await repository.removeFromGroup(id(request.params.id), id(request.params.groupId)));
  };
}

export default new UserDashboardController();
