import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { requestService } from '../services/request.service.js';
import { reminderService } from '../services/reminder.service.js';
import { UserRole } from '../types/index.js';

const router = Router();

// GET /api/requests/pending-reminders
router.get(
  '/pending-reminders',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Mark overdue first
      await reminderService.markOverdue();
      const pending = await reminderService.getPendingReminders();
      res.json({ reminders: pending });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/requests/:id
router.get(
  '/:id',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = await requestService.findById(req.params.id);
      res.json(request);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/requests/:id
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = await requestService.update(req.params.id, req.body, req.user!.email);
      res.json(request);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/requests/:id/send
router.post(
  '/:id/send',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await requestService.send(req.params.id, req.user!.email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/requests/:id/close
router.post(
  '/:id/close',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await requestService.close(req.params.id, req.user!.email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/requests/:id/reminder-sent (callback from Power Automate)
router.post(
  '/:id/reminder-sent',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { level } = req.body;
      await requestService.recordReminderSent(req.params.id, level || 1);
      res.json({ status: 'recorded' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
