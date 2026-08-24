import { randomUUID } from 'node:crypto';
import repository, { type ActivationMode } from '#repositories/advisor-management.repository';
import { AppError } from '#utils/errors';
import { hashPassword } from '#utils/password';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'administrator']);
const ADVISOR_ROLES = new Set(['ADVISOR', 'ASESOR', 'advisor']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-z0-9._-]{3,40}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (value: unknown, max = 255) => String(value ?? '').trim().slice(0, max);
const cleanText = (value: unknown, max = 255) => {
  const cleaned = String(value ?? '').trim().slice(0, max);
  // Remove or replace problematic special characters
  return cleaned.replace(/[^\w\s\-._@+()]/g, '');
};
const splitName = (fullName: string) => {
  const parts = fullName.split(/\s+/);
  return { firstName: parts.shift() || fullName, lastName: parts.join(' ') || null };
};

class AdvisorManagementService {
  private async authorization(actorId: string) {
    const roles = (await repository.roles(actorId)).map(({ code }) => code);
    return { isAdmin: roles.some((role) => ADMIN_ROLES.has(role)), isAdvisor: roles.some((role) => ADVISOR_ROLES.has(role)) };
  }

  private async scope(actorId: string, requestedAdvisorId?: unknown) {
    const authorization = await this.authorization(actorId);
    if (!authorization.isAdmin && !authorization.isAdvisor) throw new AppError('Acceso exclusivo para administradores y asesores', 403, 'ADVISOR_ACCESS_REQUIRED');
    if (!authorization.isAdmin) return { ...authorization, advisorId: actorId };
    const candidate = text(requestedAdvisorId, 36);
    if (candidate && !uuidPattern.test(candidate)) throw new AppError('Asesor invÃ¡lido', 400, 'INVALID_ADVISOR_ID');
    return { ...authorization, advisorId: candidate || null };
  }

  async listAdvisors(actorId: string) {
    if (!(await this.authorization(actorId)).isAdmin) throw new AppError('Solo el administrador puede gestionar asesores', 403, 'ADMIN_REQUIRED');
    return repository.listAdvisors();
  }

  async createAdvisor(actorId: string, body: Record<string, unknown>) {
    if (!(await this.authorization(actorId)).isAdmin) throw new AppError('Solo el administrador puede crear asesores', 403, 'ADMIN_REQUIRED');
    const fullName = text(body.fullName, 255), email = text(body.email, 190).toLowerCase(), username = text(body.username, 40).toLowerCase();
    const password = String(body.password ?? ''), confirmation = String(body.passwordConfirmation ?? '');
    if (!fullName) throw new AppError('Escribe el nombre del asesor', 400, 'NAME_REQUIRED');
    if (!emailPattern.test(email)) throw new AppError('Correo invÃ¡lido', 400, 'INVALID_EMAIL');
    if (!usernamePattern.test(username)) throw new AppError('Usuario invÃ¡lido', 400, 'INVALID_USERNAME');
    if (password.length < 8 || password !== confirmation) throw new AppError('La contraseÃ±a debe tener 8 caracteres y coincidir', 400, 'INVALID_PASSWORD');
    const names = splitName(fullName);
    const result = await repository.createAdvisor({ id: randomUUID(), actorId, fullName, email, username, passwordHash: await hashPassword(password), ...names });
    if (!result) throw new AppError('El correo o usuario ya existe', 409, 'ACCOUNT_EXISTS');
    return result;
  }

  async setAdvisorStatus(actorId: string, advisorId: string, statusValue: unknown) {
    if (!(await this.authorization(actorId)).isAdmin) throw new AppError('Solo el administrador puede gestionar asesores', 403, 'ADMIN_REQUIRED');
    const status = text(statusValue, 20).toUpperCase();
    if (!uuidPattern.test(advisorId) || !['ACTIVE', 'SUSPENDED'].includes(status)) throw new AppError('Datos de estado invÃ¡lidos', 400, 'INVALID_STATUS');
    if (!await repository.setAdvisorStatus(advisorId, status as 'ACTIVE' | 'SUSPENDED')) throw new AppError('Asesor no encontrado', 404, 'ADVISOR_NOT_FOUND');
    return { updated: true, status };
  }

  async workspace(actorId: string, requestedAdvisorId?: unknown) {
    const { advisorId } = await this.scope(actorId, requestedAdvisorId);
    return repository.workspace(advisorId);
  }

  async createGroup(actorId: string, body: Record<string, unknown>) {
    const scope = await this.scope(actorId, body.advisorId);
    if (!scope.advisorId) throw new AppError('Selecciona el asesor propietario', 400, 'ADVISOR_REQUIRED');
    const name = text(body.name, 190), description = text(body.description, 2000);
    if (!name) throw new AppError('Escribe el nombre del grupo', 400, 'GROUP_NAME_REQUIRED');
    return repository.createGroup(scope.advisorId, actorId, name, description);
  }

  async createManagedUser(actorId: string, body: Record<string, unknown>) {
    const scope = await this.scope(actorId, body.advisorId);
    if (!scope.advisorId) throw new AppError('Selecciona el asesor propietario', 400, 'ADVISOR_REQUIRED');
    const groupId = Number(body.groupId), scholarshipLevel = Number(body.scholarshipLevel), activationMode = text(body.activationMode, 10).toUpperCase() as ActivationMode;
    const fullName = text(body.fullName, 255), email = text(body.email, 190).toLowerCase(), username = text(body.username, 40).toLowerCase();
    const password = String(body.password ?? ''), confirmation = String(body.passwordConfirmation ?? '');
    if (!Number.isInteger(groupId) || groupId < 1) throw new AppError('Grupo invÃ¡lido', 400, 'INVALID_GROUP');
    if (!Number.isInteger(scholarshipLevel) || scholarshipLevel < 1 || !(await repository.scholarshipLevelExists(scholarshipLevel))) {
      throw new AppError('Tipo de beca inválido o no disponible', 400, 'INVALID_SCHOLARSHIP');
    }
    if (!['DIRECT', 'CODE'].includes(activationMode)) throw new AppError('Modo de activaciÃ³n invÃ¡lido', 400, 'INVALID_ACTIVATION_MODE');
    if (!fullName || !emailPattern.test(email) || !usernamePattern.test(username)) throw new AppError('Nombre, correo o usuario invÃ¡lidos', 400, 'INVALID_ACCOUNT');
    if (password.length < 8 || password !== confirmation) throw new AppError('La contraseÃ±a debe tener 8 caracteres y coincidir', 400, 'INVALID_PASSWORD');
    let expiresAt: string | null = null;
    const explicitExpiry = text(body.expiresAt, 10);
    const durationDays = Number(body.durationDays || 0);
    if (explicitExpiry) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(explicitExpiry) || explicitExpiry < new Date().toISOString().slice(0, 10)) throw new AppError('La fecha de vencimiento no es vÃ¡lida', 400, 'INVALID_EXPIRY');
      expiresAt = explicitExpiry;
    } else if (durationDays) {
      if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) throw new AppError('La duraciÃ³n debe estar entre 1 y 3650 dÃ­as', 400, 'INVALID_DURATION');
      const expiry = new Date(); expiry.setUTCDate(expiry.getUTCDate() + durationDays); expiresAt = expiry.toISOString().slice(0, 10);
    }
    const names = splitName(fullName);
    const result = await repository.createManagedUser({ advisorId: scope.advisorId, actorId, groupId, fullName, email, username, passwordHash: await hashPassword(password), scholarshipLevel, expiresAt, activationMode, ...names });
    if (result.kind === 'forbidden') throw new AppError('El grupo no pertenece al asesor', 403, 'GROUP_NOT_OWNED');
    if (result.kind === 'duplicate') throw new AppError('El correo o usuario ya existe', 409, 'ACCOUNT_EXISTS');
    return result;
  }

  async setManagedUserStatus(actorId: string, userId: string, statusValue: unknown, requestedAdvisorId?: unknown) {
    const scope = await this.scope(actorId, requestedAdvisorId);
    const status = text(statusValue, 20).toUpperCase();
    if (!uuidPattern.test(userId) || !['ACTIVE', 'SUSPENDED'].includes(status)) throw new AppError('Datos de estado inválidos', 400, 'INVALID_STATUS');
    if (!await repository.setManagedUserStatus(scope.isAdmin && !scope.advisorId ? null : scope.advisorId, userId, status as 'ACTIVE' | 'SUSPENDED', actorId)) throw new AppError('Usuario fuera del alcance del asesor', 404, 'MANAGED_USER_NOT_FOUND');
    return { updated: true, status };
  }

  async updateManagedUser(actorId: string, userId: string, body: Record<string, unknown>) {
    const scope = await this.scope(actorId, body.advisorId);
    if (!scope.advisorId) throw new AppError('Selecciona el asesor propietario', 400, 'ADVISOR_REQUIRED');
    if (!uuidPattern.test(userId)) throw new AppError('Usuario invÃ¡lido', 400, 'INVALID_USER_ID');

    const groupId = Number(body.groupId);
    const fullName = text(body.fullName, 255);
    const email = text(body.email, 190).toLowerCase();
    const username = text(body.username, 40).toLowerCase();
    if (!Number.isInteger(groupId) || groupId < 1) throw new AppError('Grupo invÃ¡lido', 400, 'INVALID_GROUP');
    if (!fullName || !emailPattern.test(email) || !usernamePattern.test(username)) {
      throw new AppError('Nombre, correo o usuario invÃ¡lidos', 400, 'INVALID_ACCOUNT');
    }

    const result = await repository.updateManagedUser({
      advisorId: scope.advisorId,
      actorId,
      userId,
      groupId,
      fullName,
      email,
      username,
      ...splitName(fullName),
    });
    if (result.kind === 'forbidden') throw new AppError('El grupo o usuario no pertenece al asesor', 403, 'MANAGED_USER_NOT_OWNED');
    if (result.kind === 'duplicate') throw new AppError('El correo o usuario ya existe', 409, 'ACCOUNT_EXISTS');
    return result;
  }

  async updateAdvisor(actorId: string, advisorId: string, body: Record<string, unknown>) {
    if (!(await this.authorization(actorId)).isAdmin) throw new AppError('Solo el administrador puede actualizar asesores', 403, 'ADMIN_REQUIRED');

    const fullName = cleanText(body.fullName, 255);
    const email = cleanText(body.email, 190).toLowerCase();
    const username = cleanText(body.username, 40).toLowerCase();

    if (!fullName) throw new AppError('Escribe el nombre del asesor', 400, 'NAME_REQUIRED');
    if (!emailPattern.test(email)) throw new AppError('Correo inválido', 400, 'INVALID_EMAIL');
    if (!usernamePattern.test(username)) throw new AppError('Usuario inválido', 400, 'INVALID_USERNAME');

    const names = splitName(fullName);
    const result = await repository.updateAdvisor({ id: advisorId, actorId, fullName, email, username, ...names });
    if (!result) throw new AppError('El correo o usuario ya existe', 409, 'ACCOUNT_EXISTS');

    return result;
  }

  async getAdvisorProfile(actorId: string) {
    const userInfo = await repository.roles(actorId);
    const userData = await repository.userData(actorId);

    return {
      id: actorId,
      email: userData?.email || userInfo[0]?.email || null,
      username: userData?.username || userInfo[0]?.username || null,
      displayName: userData?.display_name || userInfo[0]?.displayName || null,
      firstName: userData?.first_name || userInfo[0]?.firstName || null,
      lastName: userData?.last_name || userInfo[0]?.lastName || null,
    };
  }
}

export default new AdvisorManagementService();
