import prisma from '../config/database.js';
import { auditService } from './audit.service.js';
import { CampaignStatus, AuditAction, EntityType } from '../types/index.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

class CampaignService {
  async create(data: {
    name: string;
    control_code: string;
    description?: string;
    owner_user_id: string;
    backup_user_id?: string;
    start_date: Date;
    end_date: Date;
    reminder_policy?: Record<string, unknown>;
    escalation_policy?: Record<string, unknown>;
    email_template?: string;
  }, actorEmail: string) {
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        control_code: data.control_code,
        description: data.description,
        owner_user_id: data.owner_user_id,
        backup_user_id: data.backup_user_id,
        start_date: data.start_date,
        end_date: data.end_date,
        reminder_policy: data.reminder_policy ?? undefined,
        escalation_policy: data.escalation_policy ?? undefined,
        email_template: data.email_template,
        status: CampaignStatus.DRAFT,
      },
      include: { owner: true, backup: true },
    });

    await auditService.log({
      entityType: EntityType.CAMPAIGN,
      entityId: campaign.campaign_id,
      action: AuditAction.CAMPAIGN_CREATED,
      actorEmail,
      campaignId: campaign.campaign_id,
      details: { name: campaign.name, control_code: campaign.control_code },
    });

    return campaign;
  }

  async findAll(filters: {
    status?: CampaignStatus;
    ownerUserId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.ownerUserId) where.owner_user_id = filters.ownerUserId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { control_code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [data, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          owner: { select: { user_id: true, display_name: true, email: true } },
          _count: { select: { requests: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { campaign_id: id },
      include: {
        owner: { select: { user_id: true, display_name: true, email: true } },
        backup: { select: { user_id: true, display_name: true, email: true } },
        requests: {
          include: {
            _count: { select: { evidence_items: true } },
          },
        },
      },
    });

    if (!campaign) throw new NotFoundError('Campaña');
    return campaign;
  }

  async update(id: string, data: Record<string, unknown>, actorEmail: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { campaign_id: id },
    });

    if (!campaign) throw new NotFoundError('Campaña');
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictError('Solo se pueden editar campañas en estado Borrador');
    }

    const updated = await prisma.campaign.update({
      where: { campaign_id: id },
      data,
      include: { owner: true, backup: true },
    });

    await auditService.log({
      entityType: EntityType.CAMPAIGN,
      entityId: id,
      action: AuditAction.CAMPAIGN_UPDATED,
      actorEmail,
      campaignId: id,
      details: { updated_fields: Object.keys(data) },
    });

    return updated;
  }

  async activate(id: string, actorEmail: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { campaign_id: id },
      include: { _count: { select: { requests: true } } },
    });

    if (!campaign) throw new NotFoundError('Campaña');
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictError('Solo se pueden activar campañas en estado Borrador');
    }
    if (campaign._count.requests === 0) {
      throw new ValidationError('La campaña debe tener al menos una solicitud antes de activarse');
    }

    const updated = await prisma.campaign.update({
      where: { campaign_id: id },
      data: { status: CampaignStatus.ACTIVE },
    });

    await auditService.log({
      entityType: EntityType.CAMPAIGN,
      entityId: id,
      action: AuditAction.CAMPAIGN_ACTIVATED,
      actorEmail,
      campaignId: id,
    });

    return updated;
  }

  async checkCompletion(id: string): Promise<boolean> {
    const openRequests = await prisma.request.count({
      where: {
        campaign_id: id,
        status: { not: 'CLOSED' },
      },
    });

    if (openRequests === 0) {
      await prisma.campaign.update({
        where: { campaign_id: id },
        data: { status: CampaignStatus.COMPLETED },
      });

      await auditService.log({
        entityType: EntityType.CAMPAIGN,
        entityId: id,
        action: AuditAction.CAMPAIGN_COMPLETED,
        actorEmail: 'system',
        campaignId: id,
      });

      return true;
    }

    return false;
  }
}

export const campaignService = new CampaignService();
