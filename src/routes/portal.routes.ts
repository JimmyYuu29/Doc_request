import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticatePortalToken } from '../middleware/auth.js';
import { portalLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config/index.js';
import { otpService } from '../services/otp.service.js';
import { tokenService } from '../services/token.service.js';
import { submissionService } from '../services/submission.service.js';
import { evidenceService } from '../services/evidence.service.js';
import { auditService } from '../services/audit.service.js';
import { AuditAction, EntityType } from '../types/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import prisma from '../config/database.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSizeBytes },
});

// GET /api/submit/:token - Access portal
router.get(
  '/:token',
  portalLimiter,
  authenticatePortalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requestId, email } = req.portalSession!;

      const request = await prisma.request.findUnique({
        where: { request_id: requestId },
        include: {
          campaign: { select: { name: true, control_code: true } },
          evidence_items: {
            select: {
              evidence_id: true,
              name: true,
              type: true,
              is_mandatory: true,
              instructions: true,
              status: true,
            },
            orderBy: [{ is_mandatory: 'desc' }, { name: 'asc' }],
          },
        },
      });

      const requiresOtp = otpService.isEnabled();

      if (requiresOtp) {
        await otpService.generate(requestId, email);
      }

      await auditService.log({
        entityType: EntityType.TOKEN,
        entityId: requestId,
        action: AuditAction.TOKEN_VALIDATED,
        actorEmail: email,
        actorIp: req.ip,
      });

      res.json({
        request: {
          request_id: request!.request_id,
          recipient_name: request!.recipient_name,
          deadline: request!.deadline,
          status: request!.status,
          campaign: request!.campaign,
          evidences: request!.evidence_items,
        },
        requires_otp: requiresOtp,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/submit/:token/verify-otp
router.post(
  '/:token/verify-otp',
  portalLimiter,
  authenticatePortalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requestId, email } = req.portalSession!;
      const { code } = req.body;

      const valid = await otpService.verify(requestId, email, code);
      if (!valid) {
        throw new UnauthorizedError('Código OTP inválido o expirado');
      }

      // Issue short-lived session token
      const sessionToken = tokenService.generateSessionToken(requestId, email);

      res.cookie('portal_session', sessionToken, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000, // 30 min
      });

      res.json({ message: 'OTP verificado correctamente' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/submit/:token/upload - Upload files
router.post(
  '/:token/upload',
  portalLimiter,
  authenticatePortalToken,
  upload.array('files', 20),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requestId, email } = req.portalSession!;
      const files = req.files as Express.Multer.File[];
      const { evidence_ids, notes } = req.body;

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No se han proporcionado archivos' });
        return;
      }

      // Parse evidence_ids (sent as JSON string or array)
      const parsedEvidenceIds: string[] = typeof evidence_ids === 'string'
        ? JSON.parse(evidence_ids)
        : evidence_ids;

      const uploadedFiles = files.map((file, index) => ({
        evidence_id: parsedEvidenceIds[index],
        original_filename: file.originalname,
        buffer: file.buffer,
        mime_type: file.mimetype,
        size_bytes: file.size,
      }));

      const result = await submissionService.create({
        requestId,
        submittedByEmail: email,
        files: uploadedFiles,
        notes,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        message: 'Documentación enviada correctamente',
        submission_id: result.submission.submission_id,
        files_uploaded: result.files.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/submit/:token/status
router.get(
  '/:token/status',
  portalLimiter,
  authenticatePortalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requestId } = req.portalSession!;

      const evidences = await evidenceService.findByRequest(requestId);
      const submissions = await submissionService.getByRequest(requestId);

      res.json({ evidences, submissions });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
