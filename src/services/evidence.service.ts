import prisma from '../config/database.js';
import { auditService } from './audit.service.js';
import { EvidenceStatus, AuditAction, EntityType } from '../types/index.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

class EvidenceService {
  async findByRequest(requestId: string) {
    return prisma.evidenceItem.findMany({
      where: { request_id: requestId },
      include: {
        submission_files: {
          include: { submission: true },
          orderBy: { uploaded_at: 'desc' },
        },
        template: true,
      },
      orderBy: [{ is_mandatory: 'desc' }, { created_at: 'asc' }],
    });
  }

  async validate(evidenceId: string, actorEmail: string) {
    const evidence = await prisma.evidenceItem.findUnique({
      where: { evidence_id: evidenceId },
      include: { request: true },
    });

    if (!evidence) throw new NotFoundError('Evidencia');
    if (evidence.status !== EvidenceStatus.SUBMITTED) {
      throw new ConflictError('Solo se pueden validar evidencias en estado Enviada');
    }

    const updated = await prisma.evidenceItem.update({
      where: { evidence_id: evidenceId },
      data: {
        status: EvidenceStatus.VALIDATED,
        validated_by: actorEmail,
        validated_at: new Date(),
      },
    });

    await auditService.log({
      entityType: EntityType.EVIDENCE,
      entityId: evidenceId,
      action: AuditAction.EVIDENCE_VALIDATED,
      actorEmail,
      campaignId: evidence.request.campaign_id,
      details: { request_id: evidence.request_id, evidence_name: evidence.name },
    });

    // Check if all mandatory evidences are validated → request READY_TO_CLOSE
    await this.checkRequestReadiness(evidence.request_id);

    return updated;
  }

  async reject(evidenceId: string, actorEmail: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('El motivo del rechazo es obligatorio');
    }

    const evidence = await prisma.evidenceItem.findUnique({
      where: { evidence_id: evidenceId },
      include: { request: true },
    });

    if (!evidence) throw new NotFoundError('Evidencia');
    if (evidence.status !== EvidenceStatus.SUBMITTED) {
      throw new ConflictError('Solo se pueden rechazar evidencias en estado Enviada');
    }

    const updated = await prisma.evidenceItem.update({
      where: { evidence_id: evidenceId },
      data: {
        status: EvidenceStatus.REJECTED,
        rejection_reason: reason,
        validated_by: actorEmail,
        validated_at: new Date(),
      },
    });

    await auditService.log({
      entityType: EntityType.EVIDENCE,
      entityId: evidenceId,
      action: AuditAction.EVIDENCE_REJECTED,
      actorEmail,
      campaignId: evidence.request.campaign_id,
      details: { request_id: evidence.request_id, reason },
    });

    // Move request back for subsanation
    await prisma.request.update({
      where: { request_id: evidence.request_id },
      data: { status: 'IN_PROGRESS' },
    });

    return updated;
  }

  async resetForSubsanation(evidenceId: string) {
    const evidence = await prisma.evidenceItem.findUnique({
      where: { evidence_id: evidenceId },
    });

    if (!evidence) throw new NotFoundError('Evidencia');
    if (evidence.status !== EvidenceStatus.REJECTED) {
      throw new ConflictError('Solo se pueden subsanar evidencias rechazadas');
    }

    return prisma.evidenceItem.update({
      where: { evidence_id: evidenceId },
      data: {
        status: EvidenceStatus.PENDING,
        rejection_reason: null,
        validated_by: null,
        validated_at: null,
      },
    });
  }

  private async checkRequestReadiness(requestId: string) {
    const mandatoryEvidences = await prisma.evidenceItem.findMany({
      where: { request_id: requestId, is_mandatory: true },
    });

    const allValidated = mandatoryEvidences.every(
      (e) => e.status === EvidenceStatus.VALIDATED
    );

    if (allValidated && mandatoryEvidences.length > 0) {
      await prisma.request.update({
        where: { request_id: requestId },
        data: { status: 'READY_TO_CLOSE' },
      });
    }
  }
}

export const evidenceService = new EvidenceService();
