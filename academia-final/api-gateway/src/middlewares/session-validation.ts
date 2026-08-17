/** @file Extrae de un JWT sólo los datos necesarios para validar su sesión. */
import type { JwtPayload } from 'jsonwebtoken';

export interface SessionDescriptor {
  sessionId: string;
  userId: string;
  roles: unknown;
}

export const sessionDescriptor = (payload: JwtPayload): SessionDescriptor | null => {
  if (typeof payload.sub !== 'string' || typeof payload.jti !== 'string') return null;
  return { sessionId: payload.jti, userId: payload.sub, roles: payload.roles };
};
