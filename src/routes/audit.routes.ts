import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { auditService } from '../services/audit.service.js';
import { UserRole, EntityType, AuditAction } from '../types/index.js';

const router = Router();

// GET /api/audit-logs
router.get(
  '/',
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        entity_type,
        entity_id,
        action,
        campaign_id,
        date_from,
        date_to,
        page,
        limit,
      } = req.query;

      const result = await auditService.findAll({
        entityType: entity_type as EntityType | undefined,
        entityId: entity_id as string | undefined,
        action: action as AuditAction | undefined,
        campaignId: campaign_id as string | undefined,
        dateFrom: date_from ? new Date(date_from as string) : undefined,
        dateTo: date_to ? new Date(date_to as string) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
