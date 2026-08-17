import type { Request, Response } from 'express';
import repository, { type CentralRowInput, type RosterRowInput } from '#repositories/group-rosters.repository';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';

const positiveId = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new AppError('Grupo inválido', 400, 'INVALID_GROUP_ID');
  return parsed;
};
const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const email = (value: unknown) => clean(value, 190).toLowerCase().replace(/\s+/g, '');
const code = (value: unknown) => clean(value, 190).toUpperCase()
  .replace(/[–—−]/g, '-').replace(/[\u00A0\u200B\uFEFF]/g, '').replace(/[^A-Z0-9_-]/g, '');
const date = (value: unknown) => {
  const result = clean(value, 10);
  if (!result) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    throw new AppError('La fecha debe tener formato AAAA-MM-DD', 400, 'INVALID_DATE');
  }
  return result;
};

export class GroupRostersController {
  importCentral = async (request: Request, response: Response) => {
    const inputRows = Array.isArray(request.body.rows) ? request.body.rows : [];
    if (!inputRows.length) throw new AppError('La base central no contiene filas', 400, 'EMPTY_CENTRAL_BASE');
    if (inputRows.length > 100000) throw new AppError('La base central admite hasta 100,000 filas', 413, 'CENTRAL_BASE_TOO_LARGE');
    const rows = inputRows.map((row: Record<string, unknown>, index: number): CentralRowInput => ({
      line: Number.isInteger(Number(row.line)) && Number(row.line) > 0 ? Number(row.line) : index + 2,
      email: email(row.email), officialEmail: email(row.officialEmail), code: code(row.code),
      rfc: clean(row.rfc, 24).toUpperCase().replace(/[^A-Z0-9&Ñ]/g, ''),
      name: clean(row.name, 255), username: '',
    })).filter((row: CentralRowInput) => row.email || row.officialEmail || row.code || row.rfc || row.name);
    if (!rows.length) throw new AppError('No se encontraron datos reconocibles', 422, 'CENTRAL_BASE_WITHOUT_DATA');
    ok(response, await repository.importCentral(
      clean(request.body.fileName, 255) || 'final.xlsx', clean(request.body.sheetName, 190) || null, rows,
    ), 201);
  };

  centralHistory = async (_request: Request, response: Response) => { ok(response, await repository.centralHistory()); };

  importRoster = async (request: Request, response: Response) => {
    const inputRows = Array.isArray(request.body.rows) ? request.body.rows : [];
    if (!inputRows.length) throw new AppError('El padrón no contiene filas', 400, 'EMPTY_ROSTER');
    if (inputRows.length > 20000) throw new AppError('El padrón admite hasta 20,000 filas por carga', 413, 'ROSTER_TOO_LARGE');
    const rows = inputRows.map((row: Record<string, unknown>, index: number): RosterRowInput => ({
      line: Number.isInteger(Number(row.line)) && Number(row.line) > 0 ? Number(row.line) : index + 2,
      email: email(row.email),
      code: code(row.code),
      rfc: clean(row.rfc, 24).toUpperCase().replace(/[^A-Z0-9&Ñ]/g, ''),
      name: clean(row.name, 255),
      username: clean(row.username, 120),
    })).filter((row: RosterRowInput) => row.email || row.code || row.rfc || row.name || row.username);
    if (!rows.length) throw new AppError('No se encontraron datos reconocibles', 422, 'ROSTER_WITHOUT_DATA');
    const starts = date(request.body.starts);
    const expires = date(request.body.expires);
    if (starts && expires && starts > expires) throw new AppError('La vigencia final es anterior a la inicial', 400, 'INVALID_DATE_RANGE');
    const rawLevel = request.body.levelId;
    const levelId = rawLevel === '' || rawLevel == null ? null : Number(rawLevel);
    if (levelId != null && ![6, 8, 11].includes(levelId)) throw new AppError('Tipo de beca inválido', 400, 'INVALID_MEMBERSHIP_LEVEL');
    const result = await repository.importRoster(positiveId(request.params.groupId), {
      fileName: clean(request.body.fileName, 255) || 'padron.xlsx',
      sheetName: clean(request.body.sheetName, 190) || null,
      levelId,
      starts,
      expires,
      syncCodes: Boolean(request.body.syncCodes),
      rows,
    }, String(request.auth?.sub || '') || null);
    if (!result) throw new AppError('Grupo no encontrado', 404, 'GROUP_NOT_FOUND');
    ok(response, result, 201);
  };

  current = async (request: Request, response: Response) => {
    const status = clean(request.query.status, 30).toUpperCase();
    const allowed = ['', 'REGISTERED', 'PENDING', 'UNREGISTERED', 'WITHOUT_SCHOLARSHIP', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CENTRAL'];
    if (!allowed.includes(status)) throw new AppError('Filtro de padrón inválido', 400, 'INVALID_ROSTER_FILTER');
    const result = await repository.current(positiveId(request.params.groupId), status, clean(request.query.search, 190));
    ok(response, result);
  };

  history = async (request: Request, response: Response) => {
    ok(response, await repository.history(positiveId(request.params.groupId)));
  };

  restore = async (request: Request, response: Response) => {
    const result = await repository.restore(
      positiveId(request.params.groupId), positiveId(request.params.importId),
      String(request.auth?.sub || '') || null,
    );
    if (!result) throw new AppError('La carga histórica no pertenece al grupo', 404, 'ROSTER_IMPORT_NOT_FOUND');
    ok(response, result);
  };

  bulkAction = async (request: Request, response: Response) => {
    const action = clean(request.body.action, 30).toUpperCase() as 'SUSPEND' | 'REACTIVATE' | 'SET_EXPIRY' | 'EXTEND_DAYS' | 'INDEFINITE';
    if (!['SUSPEND', 'REACTIVATE', 'SET_EXPIRY', 'EXTEND_DAYS', 'INDEFINITE'].includes(action)) {
      throw new AppError('Acción grupal inválida', 400, 'INVALID_ROSTER_ACTION');
    }
    const endDate = action === 'SET_EXPIRY' ? date(request.body.endDate) : null;
    if (action === 'SET_EXPIRY' && !endDate) throw new AppError('Selecciona la fecha de vencimiento', 400, 'END_DATE_REQUIRED');
    const days = action === 'EXTEND_DAYS' ? Number(request.body.days) : null;
    if (action === 'EXTEND_DAYS' && (!Number.isInteger(days) || Number(days) < 1 || Number(days) > 3650)) {
      throw new AppError('La ampliación debe ser de 1 a 3650 días', 400, 'INVALID_EXTENSION_DAYS');
    }
    const result = await repository.bulkAction(
      positiveId(request.params.groupId), action, String(request.auth?.sub || '') || null, endDate, days,
    );
    if (!result) throw new AppError('El grupo no tiene un padrón vigente', 404, 'ROSTER_NOT_FOUND');
    ok(response, result);
  };
}

export default new GroupRostersController();
