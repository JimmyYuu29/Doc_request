import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import prisma from '../config/database.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import type { JwtPayload, PortalTokenPayload } from '../types/index.js';
import { UserRole } from '../types/index.js';

export function authenticateJWT(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token;

  if (!token) {
    next(new UnauthorizedError('Token de autenticación requerido'));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    next(new UnauthorizedError('Token inválido o expirado'));
  }
}

export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      next(new ForbiddenError('No tiene permisos para realizar esta acción'));
      return;
    }

    next();
  };
}

export async function authenticatePortalToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.params.token;

  if (!token) {
    next(new UnauthorizedError('Token de acceso requerido'));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.token.secret) as PortalTokenPayload;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const request = await prisma.request.findUnique({
      where: { request_id: decoded.sub },
    });

    if (!request) {
      next(new UnauthorizedError('Solicitud no encontrada'));
      return;
    }

    if (request.token_hash !== tokenHash) {
      next(new UnauthorizedError('Token no válido para esta solicitud'));
      return;
    }

    if (request.status === 'CLOSED') {
      next(new ForbiddenError('Esta solicitud ya está cerrada'));
      return;
    }

    req.portalSession = {
      requestId: decoded.sub,
      email: decoded.email,
      tokenJti: decoded.jti,
    };

    next();
  } catch {
    next(new UnauthorizedError('Token inválido o expirado'));
  }
}
