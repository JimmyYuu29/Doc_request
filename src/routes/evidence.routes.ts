import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { evidenceService } from '../services/evidence.service.js';
import { UserRole } from '../types/index.js';

const router = Router();

const rejectSchema = z.object({
  rejection_reason: z.string().min(5, 'El motivo debe tener al menos 5 caracteres'),
});

// GET /api/evidences/request/:requestId
router.get(
  '/request/:requestId',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evidences = await evidenceService.findByRequest(req.params.requestId);
      res.json({ evidences });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/evidences/:id/validate
router.post(
  '/:id/validate',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evidence = await evidenceService.validate(req.params.id, req.user!.email);
      res.json(evidence);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/evidences/:id/reject
router.post(
  '/:id/reject',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  validate(rejectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evidence = await evidenceService.reject(
        req.params.id,
        req.user!.email,
        req.body.rejection_reason
      );
      res.json(evidence);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/evidences/:id/subsanation
router.post(
  '/:id/subsanation',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evidence = await evidenceService.resetForSubsanation(req.params.id);
      res.json(evidence);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
