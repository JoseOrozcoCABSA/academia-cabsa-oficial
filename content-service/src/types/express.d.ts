import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface AuthContext extends JwtPayload {
      role?: string;
      roles?: string[];
      permissions?: string[];
    }

    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
