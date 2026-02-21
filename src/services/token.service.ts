import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import type { PortalTokenPayload } from '../types/index.js';

class TokenService {
  generateRequestToken(requestId: string, recipientEmail: string): { token: string; tokenHash: string; expiresAt: Date } {
    const jti = uuidv4();
    const expiresAt = new Date(Date.now() + config.token.expiryDays * 24 * 60 * 60 * 1000);

    const token = jwt.sign(
      {
        sub: requestId,
        email: recipientEmail,
        jti,
      },
      config.token.secret,
      {
        expiresIn: `${config.token.expiryDays}d`,
        algorithm: 'HS256',
      }
    );

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return { token, tokenHash, expiresAt };
  }

  verifyRequestToken(token: string): PortalTokenPayload {
    return jwt.verify(token, config.token.secret) as PortalTokenPayload;
  }

  generateSessionToken(requestId: string, email: string): string {
    return jwt.sign(
      {
        sub: requestId,
        email,
        type: 'session',
      },
      config.token.secret,
      {
        expiresIn: '30m',
        algorithm: 'HS256',
      }
    );
  }

  buildAccessUrl(token: string): string {
    return `${config.baseUrl}/submit/${token}`;
  }
}

export const tokenService = new TokenService();
