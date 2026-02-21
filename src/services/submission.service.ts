import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { notificationService } from './notification.service.js';
import { requestService } from './request.service.js';
import { auditService } from './audit.service.js';
import { AuditAction, EntityType, EvidenceStatus } from '../types/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

interface UploadedFile {
  evidence_id: string;
  original_filename: string;
  buffer: Buffer;
  mime_type: string;
  size_bytes: number;
}

class SubmissionService {
  async create(params: {
    requestId: string;
    submittedByEmail: string;
    files: UploadedFile[];
    notes?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const request = await prisma.request.findUnique({
      where: { request_id: params.requestId },
      include: { evidence_items: true, campaign: true },
    });

    if (!request) throw new NotFoundError('Solicitud');

    // Validate evidence IDs belong to this request
    const evidenceIds = new Set(request.evidence_items.map((e) => e.evidence_id));
    for (const file of params.files) {
      if (!evidenceIds.has(file.evidence_id)) {
        throw new ValidationError(`Evidencia ${file.evidence_id} no pertenece a esta solicitud`);
      }
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        request_id: params.requestId,
        submitted_by_email: params.submittedByEmail,
        ip_address: params.ip,
        user_agent: params.userAgent,
        notes: params.notes,
      },
    });

    // Save files and create records
    const submissionFiles = [];
    for (const file of params.files) {
      const storedFilename = `${uuidv4()}_${file.original_filename}`;
      const dirPath = path.join(config.upload.dir, params.requestId, file.evidence_id);
      const filePath = path.join(dirPath, storedFilename);

      // Save to disk
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, file.buffer);

      // Create DB record
      const submissionFile = await prisma.submissionFile.create({
        data: {
          submission_id: submission.submission_id,
          evidence_id: file.evidence_id,
          original_filename: file.original_filename,
          stored_filename: storedFilename,
          mime_type: file.mime_type,
          size_bytes: file.size_bytes,
        },
      });

      // Update evidence status to SUBMITTED
      await prisma.evidenceItem.update({
        where: { evidence_id: file.evidence_id },
        data: {
          status: EvidenceStatus.SUBMITTED,
          file_size_bytes: file.size_bytes,
          file_mime_type: file.mime_type,
        },
      });

      // Archive to SharePoint (mock)
      try {
        const folderPath = `${request.campaign.control_code}/${request.campaign_id}/${params.requestId}`;
        const archiveResult = await notificationService.archiveFile({
          file_content_base64: file.buffer.toString('base64'),
          file_name: file.original_filename,
          folder_path: folderPath,
          metadata: {
            request_id: params.requestId,
            evidence_id: file.evidence_id,
            uploaded_by: params.submittedByEmail,
            uploaded_at: new Date().toISOString(),
          },
        });

        // Update with SP path
        await prisma.evidenceItem.update({
          where: { evidence_id: file.evidence_id },
          data: {
            file_sp_path: archiveResult.sp_path,
            file_sp_url: archiveResult.sp_url,
          },
        });

        await prisma.submissionFile.update({
          where: { file_id: submissionFile.file_id },
          data: {
            sp_path: archiveResult.sp_path,
            sp_url: archiveResult.sp_url,
          },
        });
      } catch (error) {
        logger.error('Failed to archive file to SharePoint', { error, evidence_id: file.evidence_id });
      }

      await auditService.log({
        entityType: EntityType.FILE,
        entityId: submissionFile.file_id,
        action: AuditAction.FILE_UPLOADED,
        actorEmail: params.submittedByEmail,
        actorIp: params.ip,
        campaignId: request.campaign_id,
        details: {
          filename: file.original_filename,
          evidence_id: file.evidence_id,
          size_bytes: file.size_bytes,
        },
      });

      submissionFiles.push(submissionFile);
    }

    await auditService.log({
      entityType: EntityType.SUBMISSION,
      entityId: submission.submission_id,
      action: AuditAction.SUBMISSION_CREATED,
      actorEmail: params.submittedByEmail,
      actorIp: params.ip,
      campaignId: request.campaign_id,
      details: { file_count: params.files.length },
    });

    // Update request status
    await requestService.updateStatusOnSubmission(params.requestId);

    return { submission, files: submissionFiles };
  }

  async getByRequest(requestId: string) {
    return prisma.submission.findMany({
      where: { request_id: requestId },
      include: {
        files: {
          include: { evidence: { select: { name: true, status: true } } },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });
  }
}

export const submissionService = new SubmissionService();
