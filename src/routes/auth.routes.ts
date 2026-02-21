import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validation.js';
import { auditService } from '../services/audit.service.js';
import { UnauthorizedError } from '../utils/errors.js';
import { UserRole, AuditAction, EntityType } from '../types/index.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new UnauthorizedError('Credenciales inválidas');

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) throw new UnauthorizedError('Credenciales inválidas');

      const token = jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.cookie('access_token', token, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8h
      });

      await auditService.log({
        entityType: EntityType.USER,
        entityId: user.user_id,
        action: AuditAction.USER_LOGIN,
        actorEmail: user.email,
        actorIp: req.ip,
      });

      res.json({
        user: {
          user_id: user.user_id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          department: user.department,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', authenticateJWT, (req: Request, res: Response) => {
  const user = req.user!;
  const token = jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  res.json({ message: 'Token renovado' });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('access_token');
  res.json({ message: 'Sesión cerrada' });
});

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user!.userId },
      select: {
        user_id: true,
        email: true,
        display_name: true,
        role: true,
        department: true,
      },
    });

    if (!user) throw new UnauthorizedError('Usuario no encontrado');
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/users (ADMIN only)
router.get(
  '/users',
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          user_id: true,
          email: true,
          display_name: true,
          role: true,
          department: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({ users });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
