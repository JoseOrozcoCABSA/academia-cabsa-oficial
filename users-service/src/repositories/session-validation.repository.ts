/** @file Estado persistido necesario para validar o revocar una sesión JWT. */
import { QueryTypes } from 'sequelize';
import database from '#config/database';

export interface SessionState {
  status: string;
  revoked_at: Date | null;
  roles: string | null;
}

export class SessionValidationRepository {
  async state(sessionId: string, userId: string): Promise<SessionState | null> {
    const rows = await database.query<SessionState>(
      `SELECT u.status,s.revoked_at,
              GROUP_CONCAT(DISTINCT r.code ORDER BY r.code SEPARATOR ',') roles
       FROM usuarios_sesiones_jwt s
       INNER JOIN usuarios_cuentas u ON u.id=s.user_id
       LEFT JOIN usuarios_asignaciones_roles ur ON ur.user_id=u.id
       LEFT JOIN usuarios_roles r ON r.id=ur.role_id
       WHERE s.id=:sessionId AND s.user_id=:userId
       GROUP BY u.status,s.revoked_at
       LIMIT 1`,
      { replacements: { sessionId, userId }, type: QueryTypes.SELECT },
    );
    return rows[0] ?? null;
  }
}

export default new SessionValidationRepository();
