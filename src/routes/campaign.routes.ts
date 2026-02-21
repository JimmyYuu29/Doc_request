import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { campaignService } from '../services/campaign.service.js';
import { requestService } from '../services/request.service.js';
import { reportService } from '../services/report.service.js';
import { UserRole } from '../types/index.js';

const router = Router();

const createCampaignSchema = z.object({
  name: z.string().min(3, 'Nombre mínimo 3 caracteres'),
  control_code: z.string().min(2, 'Código de control requerido'),
  description: z.string().optional(),
  owner_user_id: z.string().uuid(),
  backup_user_id: z.string().uuid().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  reminder_policy: z.record(z.unknown()).optional(),
  escalation_policy: z.record(z.unknown()).optional(),
  email_template: z.string().optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

// POST /api/campaigns
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  validate(createCampaignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await campaignService.create(req.body, req.user!.email);
      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/campaigns
router.get(
  '/',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, search, page, limit } = req.query;

      const filters: Record<string, unknown> = {};
      if (status) filters.status = status;
      if (search) filters.search = search;
      if (page) filters.page = Number(page);
      if (limit) filters.limit = Number(limit);

      // OWNER sees only their campaigns, ADMIN sees all
      if (req.user!.role === UserRole.OWNER) {
        filters.ownerUserId = req.user!.userId;
      }

      const result = await campaignService.findAll(filters as any);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/campaigns/:id
router.get(
  '/:id',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await campaignService.findById(req.params.id);
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/campaigns/:id
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  validate(updateCampaignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await campaignService.update(req.params.id, req.body, req.user!.email);
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/campaigns/:id/activate
router.post(
  '/:id/activate',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await campaignService.activate(req.params.id, req.user!.email);
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/campaigns/:id/requests (bulk create)
router.post(
  '/:id/requests',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requests = await requestService.createBulk(
        req.params.id,
        req.body.requests,
        req.user!.email
      );
      res.status(201).json({ requests });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/campaigns/:id/requests
router.get(
  '/:id/requests',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, page, limit } = req.query;
      const result = await requestService.findByCampaign(req.params.id, {
        status: status as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/campaigns/:id/dashboard
router.get(
  '/:id/dashboard',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dashboard = await reportService.getCampaignDashboard(req.params.id);
      res.json(dashboard);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/campaigns/:id/report
router.get(
  '/:id/report',
  authenticateJWT,
  authorizeRoles(UserRole.OWNER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pdfBuffer = await reportService.generateCampaignReport(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Informe_Campaña_${req.params.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
