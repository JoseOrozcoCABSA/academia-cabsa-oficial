import type { Request, Response } from 'express';
import repository, {
  type CodeInput, type MatchMode, type ScholarshipProfileInput,
} from '#repositories/scholarship-codes.repository';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';
import platformSettingsRepository from '#repositories/platform-settings.repository';

const normalizeCode = (value: unknown) => String(value ?? '')
  .trim().toUpperCase()
  .replace(/[–—−]/g, '-')
  .replace(/[\u00A0\u200B\uFEFF]/g, '')
  .replace(/[^A-Z0-9_-]/g, '');
const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const dateValue = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new AppError('Las fechas deben tener formato AAAA-MM-DD', 400, 'INVALID_DATE');
  }
  return text;
};
const modeValue = (value: unknown): MatchMode => {
  const mode = String(value || 'starts_with') as MatchMode;
  return ['starts_with', 'contains', 'ends_with', 'exact'].includes(mode) ? mode : 'starts_with';
};
const positiveInteger = (value: unknown, fallback: number, maximum = 1000) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new AppError(`El valor debe ser un entero entre 1 y ${maximum}`, 400, 'INVALID_NUMBER');
  }
  return parsed;
};

const scholarshipProfileInput = (body: Record<string, unknown>): ScholarshipProfileInput => {
  const name = String(body.name || '').trim().slice(0, 255);
  const description = String(body.description || '').trim();
  if (!name || !description) throw new AppError('Nombre y descripción son obligatorios', 400, 'INVALID_SCHOLARSHIP_PROFILE');
  const expirationPeriod = String(body.expirationPeriod || 'Month');
  if (!['Day', 'Week', 'Month', 'Year'].includes(expirationPeriod)) {
    throw new AppError('Periodo de vigencia inválido', 400, 'INVALID_EXPIRATION_PERIOD');
  }
  return {
    name,
    description,
    expirationNumber: positiveInteger(body.expirationNumber, 1, 1200),
    expirationPeriod,
    allowSignups: Boolean(body.allowSignups),
    copyAccessFrom: body.copyAccessFrom ? positiveInteger(body.copyAccessFrom, 1, 100000) : null,
    dependentLevelId: body.dependentLevelId ? positiveInteger(body.dependentLevelId, 1, 100000) : null,
    dependentRuleName: String(body.dependentRuleName || '').trim().slice(0, 160) || null,
    dependentLabel: String(body.dependentLabel || '').trim().slice(0, 80) || null,
    seatLimit: positiveInteger(body.seatLimit, 1, 1000),
    inheritExpiry: body.inheritExpiry !== false,
    allowProgress: body.allowProgress !== false,
    active: body.active !== false,
    // Se almacena literalmente para que el administrador pueda copiar, pegar
    // y recuperar el mismo HTML sin convertirlo en múltiples campos.
    presentationConfig: String(body.presentationHtml || '').trim().slice(0, 100000),
  };
};

interface ParsedLine {
  line: number;
  code: string;
  email: string;
  raw: string;
}

const parseList = (text: unknown, defaultEmail = '') => String(text ?? '')
  .split(/\r?\n/)
  .map((raw, index): ParsedLine | null => {
    const clean = raw.trim();
    if (!clean) return null;
    const parts = clean.split(/[\t,;|]+/).map((part) => part.trim()).filter(Boolean);
    let code = normalizeCode(parts[0]);
    let email = normalizeEmail(parts[1] || defaultEmail);
    if (validEmail(parts[0] || '') && parts[1]) {
      email = normalizeEmail(parts[0]);
      code = normalizeCode(parts[1]);
    }
    return { line: index + 1, code, email, raw: clean };
  })
  .filter((row): row is ParsedLine => Boolean(row));

async function validateRows(rows: ParsedLine[]) {
  const errors: Array<ParsedLine & { reason: string }> = [];
  const valid: ParsedLine[] = [];
  const codeCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.code) errors.push({ ...row, reason: 'Código vacío o inválido' });
    else if (!validEmail(row.email)) errors.push({ ...row, reason: 'Correo vacío o inválido' });
    else {
      valid.push(row);
      codeCounts.set(row.code, (codeCounts.get(row.code) || 0) + 1);
      emailCounts.set(row.email, (emailCounts.get(row.email) || 0) + 1);
      const pair = `${row.code}|${row.email}`;
      pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
    }
  }
  const existing = await repository.existingFor(
    [...new Set(valid.map((row) => row.code))],
    [...new Set(valid.map((row) => row.email))],
  );
  const byCode = new Map(existing.map((row) => [row.code, row]));
  const newRows: ParsedLine[] = [];
  const unchanged: ParsedLine[] = [];
  const conflicts: Array<ParsedLine & { currentEmail: string }> = [];
  for (const row of valid) {
    const current = byCode.get(row.code);
    if (!current) newRows.push(row);
    else if (current.allowed_email.toLowerCase() === row.email) unchanged.push(row);
    else conflicts.push({ ...row, currentEmail: current.allowed_email });
  }
  return {
    totalLines: rows.length,
    valid: valid.length,
    errors,
    newRows,
    unchanged,
    conflicts,
    duplicateCodes: [...codeCounts].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count })),
    duplicateEmails: [...emailCounts].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count })),
    duplicatePairs: [...pairCounts].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count })),
  };
}

export class ScholarshipCodesController {
  selfCancellationSetting = async (_request: Request, response: Response) => {
    ok(response, { enabled: await platformSettingsRepository.scholarshipSelfCancellationEnabled() });
  };

  updateSelfCancellationSetting = async (request: Request, response: Response) => {
    if (typeof request.body.enabled !== 'boolean') {
      throw new AppError('El estado de autocancelación debe ser verdadero o falso', 400, 'INVALID_SETTING');
    }
    const administratorId = request.auth?.sub;
    if (!administratorId) throw new AppError('Token requerido', 401, 'INVALID_TOKEN_SUBJECT');
    ok(response, await platformSettingsRepository.setScholarshipSelfCancellation(
      request.body.enabled,
      String(administratorId),
    ));
  };

  profiles = async (_request: Request, response: Response) => {
    ok(response, await repository.profiles());
  };

  createProfile = async (request: Request, response: Response) => {
    ok(response, await repository.createProfile(scholarshipProfileInput(request.body)), 201);
  };

  updateProfile = async (request: Request, response: Response) => {
    const levelId = positiveInteger(request.params.levelId, 1, 100000);
    const input = scholarshipProfileInput(request.body);
    if (input.dependentLevelId === levelId) {
      throw new AppError('Una beca no puede patrocinarse a sí misma', 400, 'SCHOLARSHIP_SELF_DEPENDENCY');
    }
    const result = await repository.updateProfile(levelId, input);
    if (!result) throw new AppError('Perfil de beca no encontrado', 404, 'SCHOLARSHIP_PROFILE_NOT_FOUND');
    ok(response, result);
  };

  overview = async (_request: Request, response: Response) => {
    ok(response, await repository.overview());
  };

  list = async (request: Request, response: Response) => {
    ok(response, await repository.list({
      search: String(request.query.search || '').trim(),
      email: String(request.query.email || '').trim().toLowerCase(),
      level: Number(request.query.level || 0),
      status: String(request.query.status || ''),
      batch: String(request.query.batch || '').trim(),
      page: positiveInteger(request.query.page, 1, 100000),
      limit: positiveInteger(request.query.limit, 50, 500),
    }));
  };

  validate = async (request: Request, response: Response) => {
    const rows = parseList(request.body.text, normalizeEmail(request.body.defaultEmail));
    if (!rows.length) throw new AppError('Pega al menos un código y correo', 400, 'EMPTY_CODE_LIST');
    ok(response, await validateRows(rows));
  };

  import = async (request: Request, response: Response) => {
    const rows = parseList(request.body.text, normalizeEmail(request.body.defaultEmail));
    if (!rows.length) throw new AppError('Pega al menos un código y correo', 400, 'EMPTY_CODE_LIST');
    const validation = await validateRows(rows);
    if (validation.errors.length) {
      throw new AppError('Corrige las líneas inválidas antes de guardar', 422, 'INVALID_CODE_LINES');
    }
    const levelId = positiveInteger(request.body.levelId, 0, 100000);
    const starts = dateValue(request.body.starts);
    const expires = dateValue(request.body.expires);
    if (starts && expires && starts > expires) {
      throw new AppError('La fecha final no puede ser anterior a la inicial', 400, 'INVALID_DATE_RANGE');
    }
    const unique = new Map<string, ParsedLine>();
    rows.forEach((row) => unique.set(row.code, row));
    const inputs: CodeInput[] = [...unique.values()].map((row) => ({
      code: row.code,
      email: row.email,
      levelId,
      starts,
      expires,
      maxUses: positiveInteger(request.body.maxUses, 1, 1000),
      batch: String(request.body.batch || '').trim().slice(0, 120) || null,
      notes: String(request.body.notes || '').trim() || null,
    }));
    ok(response, {
      ...(await repository.upsertMany(inputs)),
      duplicatedLinesIgnored: rows.length - inputs.length,
      conflictsUpdated: validation.conflicts.length,
    }, 201);
  };

  update = async (request: Request, response: Response) => {
    const id = positiveInteger(request.params.id, 0, Number.MAX_SAFE_INTEGER);
    const input: Partial<CodeInput> & { state?: string } = {};
    if ('code' in request.body) {
      input.code = normalizeCode(request.body.code);
      if (!input.code) throw new AppError('Código inválido', 400, 'INVALID_CODE');
    }
    if ('email' in request.body) {
      input.email = normalizeEmail(request.body.email);
      if (!validEmail(input.email)) throw new AppError('Correo inválido', 400, 'INVALID_EMAIL');
    }
    if ('levelId' in request.body) input.levelId = positiveInteger(request.body.levelId, 0, 100000);
    if ('starts' in request.body) input.starts = dateValue(request.body.starts);
    if ('expires' in request.body) input.expires = dateValue(request.body.expires);
    if ('maxUses' in request.body) input.maxUses = positiveInteger(request.body.maxUses, 1, 1000);
    if ('batch' in request.body) input.batch = String(request.body.batch || '').trim().slice(0, 120) || null;
    if ('notes' in request.body) input.notes = String(request.body.notes || '').trim() || null;
    if ('state' in request.body) {
      input.state = String(request.body.state);
      if (!['ACTIVE', 'REVOKED'].includes(input.state)) throw new AppError('Estado inválido', 400, 'INVALID_STATE');
    }
    const result = await repository.update(id, input);
    if (!result) throw new AppError('Código no encontrado', 404, 'CODE_NOT_FOUND');
    ok(response, result);
  };

  remove = async (request: Request, response: Response) => {
    const deleted = await repository.remove(positiveInteger(request.params.id, 0, Number.MAX_SAFE_INTEGER));
    if (!deleted) {
      throw new AppError('El código no existe o tiene historial. Revócalo para conservar la auditoría', 409, 'CODE_HAS_HISTORY');
    }
    ok(response, { deleted: true });
  };

  previewPattern = async (request: Request, response: Response) => {
    const term = normalizeCode(request.body.term);
    if (!term) throw new AppError('Escribe una nomenclatura', 400, 'EMPTY_PATTERN');
    ok(response, await repository.patternPreview(term, modeValue(request.body.mode)));
  };

  removePattern = async (request: Request, response: Response) => {
    const term = normalizeCode(request.body.term);
    if (!term) throw new AppError('Escribe una nomenclatura', 400, 'EMPTY_PATTERN');
    if (String(request.body.confirmation || '') !== `ELIMINAR ${term}`) {
      throw new AppError(`Escribe ELIMINAR ${term} para confirmar`, 400, 'CONFIRMATION_REQUIRED');
    }
    ok(response, await repository.patternRemove(term, modeValue(request.body.mode)));
  };

  group = async (request: Request, response: Response) => {
    const term = normalizeCode(request.query.term);
    if (!term) throw new AppError('Escribe la nomenclatura del grupo', 400, 'EMPTY_GROUP_PATTERN');
    ok(response, await repository.group(term, modeValue(request.query.mode)));
  };

  updateGroupExpiry = async (request: Request, response: Response) => {
    const term = normalizeCode(request.body.term);
    const endDate = dateValue(request.body.endDate);
    if (!term || !endDate) throw new AppError('Nomenclatura y fecha son obligatorias', 400, 'INVALID_GROUP_EXPIRY');
    const group = await repository.group(term, modeValue(request.body.mode));
    const ids = (group.users as Array<{ activation_id: string }>).map((row) => row.activation_id);
    ok(response, { updated: await repository.updateActivationExpiry(ids, endDate), total: ids.length });
  };

  updateUserExpiry = async (request: Request, response: Response) => {
    const id = String(request.params.activationId || '');
    const endDate = dateValue(request.body.endDate);
    if (!id || !endDate) throw new AppError('Activación y fecha son obligatorias', 400, 'INVALID_USER_EXPIRY');
    ok(response, { updated: await repository.updateActivationExpiry([id], endDate) });
  };

  setActivationSuspended = async (request: Request, response: Response) => {
    const id = String(request.params.activationId || '');
    if (!id) throw new AppError('Activación requerida', 400, 'ACTIVATION_REQUIRED');
    const result = await repository.setActivationSuspended(id, Boolean(request.body.suspended));
    if (!result) throw new AppError('Activación no encontrada', 404, 'ACTIVATION_NOT_FOUND');
    ok(response, result);
  };
}

export default new ScholarshipCodesController();
