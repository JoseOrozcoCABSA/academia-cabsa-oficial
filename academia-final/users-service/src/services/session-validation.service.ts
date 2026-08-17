/** @file Valida que una sesión firmada siga activa y conserve sus roles. */
import repository from '#repositories/session-validation.repository';
import { sameRoles } from './session-validation.rules.js';

export class SessionValidationService {
  async validate(input: { sessionId?: unknown; userId?: unknown; roles?: unknown }) {
    if (typeof input.sessionId !== 'string' || typeof input.userId !== 'string') return false;
    const state = await repository.state(input.sessionId, input.userId);
    return Boolean(state)
      && state!.status === 'ACTIVE'
      && state!.revoked_at === null
      && sameRoles(input.roles, state!.roles);
  }
}

export default new SessionValidationService();
