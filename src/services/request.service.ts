import prisma from '../config/database.js';
import { tokenService } from './token.service.js';
import { notificationService } from './notification.service.js';
import { auditService } from './audit.service.js';
import { campaignService } from './campaign.service.js';
import { RequestStatus, AuditAction, EntityType, EvidenceStatus } from '../types/index.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

interface CreateRequestData {
  recipient_email: string;
  recipient_name: string;
  cc_emails?: string[];
  delegate_email?: string;
  deadline: Date;
  evidences: {
    name: string;
    type: string;
    is_mandatory?: boolean;
    instructions?: string;
    template_id?: string;
  }[];
}

class RequestService {
  async createBulk(campaignId: string, requestsData: CreateRequestData[], actorEmail: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { campaign_id: campaignId },
    });

    if (!campaign) throw new NotFoundError('Campaña');
    if (campaign.status !== 'DRAFT' && campaign.status !== 'ACTIVE') {
      throw new ConflictError('Solo se pueden crear solicitudes en campañas en Borrador o Activas');
    }

    const created = [];

    for (const reqData of requestsData) {
      const request = await prisma.request.create({
        data: {
          campaign_id: campaignId,
          recipient_email: reqData.recipient_email,
          recipient_name: reqData.recipient_name,
          cc_emails: reqData.cc_emails ?? undefined,
          delegate_email: reqData.delegate_email,
          deadline: reqData.deadline,
          status: RequestStatus.DRAFT,
          evidence_items: {
            create: reqData.evidences.map((ev) => ({
              name: ev.name,
              type: ev.type as any,
              is_mandatory: ev.is_mandatory ?? true,
              instructions: ev.instructions,
              template_id: ev.template_id,
            })),
          },
        },
        include: { evidence_items: true },
      });

      await auditService.log({
        entityType: EntityType.REQUEST,
        entityId: request.request_id,
        action: AuditAction.REQUEST_CREATED,
        actorEmail,
        campaignId,
        details: {
          recipient: reqData.recipient_email,
          evidence_count: reqData.evidences.length,
        },
      });

      created.push(request);
    }

    return created;
  }

  async findByCampaign(campaignId: string, filters: { status?: string; page?: number; limit?: number }) {
    const where: Record<string, unknown> = { campaign_id: campaignId };
    if (filters.status) where.status = filters.status;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const [data, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          evidence_items: {
            select: { evidence_id: true, name: true, status: true, is_mandatory: true },
          },
          _count: { select: { submissions: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.request.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const request = await prisma.request.findUnique({
      where: { request_id: id },
      include: {
        campaign: {
          select: { campaign_id: true, name: true, control_code: true, email_template: true },
        },
        evidence_items: {
          include: {
            submission_files: { orderBy: { uploaded_at: 'desc' }, take: 1 },
          },
          orderBy: [{ is_mandatory: 'desc' }, { created_at: 'asc' }],
        },
        submissions: {
          include: { files: true },
          orderBy: { submitted_at: 'desc' },
        },
      },
    });

    if (!request) throw new NotFoundError('Solicitud');
    return request;
  }

  async update(id: string, data: Record<string, unknown>, actorEmail: string) {
    const request = await prisma.request.findUnique({ where: { request_id: id } });
    if (!request) throw new NotFoundError('Solicitud');
    if (request.status !== RequestStatus.DRAFT) {
      throw new ConflictError('Solo se pueden editar solicitudes en estado Borrador');
    }

    return prisma.request.update({
      where: { request_id: id },
      data,
    });
  }

  async send(id: string, actorEmail: string) {
    const request = await prisma.request.findUnique({
      where: { request_id: id },
      include: {
        campaign: true,
        evidence_items: true,
      },
    });

    if (!request) throw new NotFoundError('Solicitud');
    if (request.status !== RequestStatus.DRAFT) {
      throw new ConflictError('Solo se pueden enviar solicitudes en estado Borrador');
    }

    // Generate token
    const { token, tokenHash, expiresAt } = tokenService.generateRequestToken(
      request.request_id,
      request.recipient_email
    );

    // Update request with token
    await prisma.request.update({
      where: { request_id: id },
      data: {
        status: RequestStatus.SENT,
        token_hash: tokenHash,
        token_expires_at: expiresAt,
      },
    });

    // Build email content
    const accessUrl = tokenService.buildAccessUrl(token);
    const evidenceList = request.evidence_items
      .map((e) => `- ${e.name} (${e.is_mandatory ? 'Obligatorio' : 'Opcional'})`)
      .join('\n');

    let bodyHtml = request.campaign.email_template || defaultEmailTemplate();
    bodyHtml = bodyHtml
      .replace('{{recipient_name}}', request.recipient_name)
      .replace('{{control_code}}', request.campaign.control_code)
      .replace('{{access_url}}', accessUrl)
      .replace('{{deadline}}', request.deadline.toLocaleDateString('es-ES'))
      .replace('{{evidence_list}}', evidenceList);

    // Send via Power Automate
    await notificationService.sendInitialRequest({
      to: request.recipient_email,
      cc: request.delegate_email || undefined,
      subject: `[${request.campaign.control_code}] Solicitud de documentación ${request.request_id.substring(0, 8)}`,
      body_html: bodyHtml,
      importance: 'High',
      request_id: request.request_id,
      control_code: request.campaign.control_code,
    });

    await auditService.log({
      entityType: EntityType.REQUEST,
      entityId: id,
      action: AuditAction.REQUEST_SENT,
      actorEmail,
      campaignId: request.campaign_id,
      details: { recipient: request.recipient_email, token_expires: expiresAt },
    });

    return { request_id: id, access_url: accessUrl };
  }

  async close(id: string, actorEmail: string) {
    const request = await prisma.request.findUnique({
      where: { request_id: id },
      include: { evidence_items: true, campaign: true },
    });

    if (!request) throw new NotFoundError('Solicitud');

    const mandatoryPending = request.evidence_items.filter(
      (e) => e.is_mandatory && e.status !== EvidenceStatus.VALIDATED
    );

    if (mandatoryPending.length > 0) {
      throw new ValidationError(
        `Hay ${mandatoryPending.length} evidencia(s) obligatoria(s) sin validar`
      );
    }

    await prisma.request.update({
      where: { request_id: id },
      data: {
        status: RequestStatus.CLOSED,
        closed_at: new Date(),
      },
    });

    // Send close notification
    await notificationService.sendCloseNotification({
      to: request.recipient_email,
      subject: `[${request.campaign.control_code}] Solicitud cerrada`,
      body_html: `<p>Estimado/a ${request.recipient_name},</p><p>Su solicitud de documentación ha sido cerrada satisfactoriamente. Gracias por su colaboración.</p>`,
      request_id: id,
    });

    await auditService.log({
      entityType: EntityType.REQUEST,
      entityId: id,
      action: AuditAction.REQUEST_CLOSED,
      actorEmail,
      campaignId: request.campaign_id,
    });

    // Check if campaign is complete
    await campaignService.checkCompletion(request.campaign_id);

    return { request_id: id, status: 'CLOSED' };
  }

  async getPendingReminders() {
    const requests = await prisma.request.findMany({
      where: {
        status: { in: ['SENT', 'IN_PROGRESS', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        campaign: {
          select: {
            control_code: true,
            reminder_policy: true,
            escalation_policy: true,
          },
        },
      },
    });

    const now = new Date();
    const pending = [];

    for (const req of requests) {
      const policy = req.campaign.reminder_policy as any;
      if (!policy) continue;

      const maxReminders = policy.max_reminders ?? 5;
      if (req.reminder_count >= maxReminders) continue;

      const startAfterDays = policy.start_after_days ?? 2;
      const frequencyDays = policy.frequency_days ?? 3;

      const sentDate = req.last_reminder_at || req.created_at;
      const daysSinceLastAction = Math.floor(
        (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (req.reminder_count === 0 && daysSinceLastAction < startAfterDays) continue;
      if (req.reminder_count > 0 && daysSinceLastAction < frequencyDays) continue;

      // Calculate escalation level
      const escalationPolicy = req.campaign.escalation_policy as any;
      let level = 1;
      if (escalationPolicy?.levels) {
        for (const lvl of escalationPolicy.levels) {
          if (req.reminder_count >= lvl.after_reminders) {
            level = lvl.level;
          }
        }
      }

      pending.push({
        request_id: req.request_id,
        recipient_email: req.recipient_email,
        recipient_name: req.recipient_name,
        cc_emails: req.cc_emails,
        delegate_email: req.delegate_email,
        deadline: req.deadline,
        reminder_count: req.reminder_count,
        escalation_level: level,
        control_code: req.campaign.control_code,
      });
    }

    return pending;
  }

  async recordReminderSent(id: string, level: number) {
    await prisma.request.update({
      where: { request_id: id },
      data: {
        reminder_count: { increment: 1 },
        last_reminder_at: new Date(),
        escalation_level: level,
      },
    });

    await auditService.log({
      entityType: EntityType.REQUEST,
      entityId: id,
      action: AuditAction.REQUEST_REMINDER_SENT,
      actorEmail: 'system',
      details: { level },
    });
  }

  async updateStatusOnSubmission(requestId: string) {
    const evidences = await prisma.evidenceItem.findMany({
      where: { request_id: requestId },
    });

    const totalMandatory = evidences.filter((e) => e.is_mandatory);
    const submittedOrValidated = totalMandatory.filter(
      (e) => e.status === EvidenceStatus.SUBMITTED || e.status === EvidenceStatus.VALIDATED
    );

    let newStatus: RequestStatus;

    if (submittedOrValidated.length === totalMandatory.length && totalMandatory.length > 0) {
      newStatus = RequestStatus.SUBMITTED;
    } else if (submittedOrValidated.length > 0) {
      newStatus = RequestStatus.PARTIAL;
    } else {
      newStatus = RequestStatus.IN_PROGRESS;
    }

    await prisma.request.update({
      where: { request_id: requestId },
      data: { status: newStatus },
    });
  }
}

function defaultEmailTemplate(): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Solicitud de Documentación</h2>
      <p>Estimado/a <strong>{{recipient_name}}</strong>,</p>
      <p>Se le solicita la siguiente documentación para el control <strong>{{control_code}}</strong>:</p>
      <pre style="background: #f7f7f7; padding: 12px; border-radius: 4px;">{{evidence_list}}</pre>
      <p><strong>Fecha límite:</strong> {{deadline}}</p>
      <p>
        <a href="{{access_url}}"
           style="display: inline-block; background: #2b6cb0; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none;">
          Acceder a la solicitud
        </a>
      </p>
      <p style="color: #718096; font-size: 12px;">Este enlace es personal e intransferible. Tiene una validez limitada.</p>
    </div>
  `;
}

export const requestService = new RequestService();
