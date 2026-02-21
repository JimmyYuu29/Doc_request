import prisma from '../config/database.js';
import { AuditAction, EntityType } from '../types/index.js';
import logger from '../utils/logger.js';

interface AuditLogParams {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  actorEmail: string;
  actorIp?: string;
  details?: Record<string, unknown>;
  campaignId?: string;
}

class AuditService {
  async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          entity_type: params.entityType,
          entity_id: params.entityId,
          action: params.action,
          actor_email: params.actorEmail,
          actor_ip: params.actorIp,
          details: params.details ?? undefined,
          campaign_id: params.campaignId,
        },
      });

      logger.info('Audit log created', {
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        actor: params.actorEmail,
      });
    } catch (error) {
      logger.error('Failed to create audit log', {
        error,
        params,
      });
    }
  }

  async findAll(filters: {
    entityType?: EntityType;
    entityId?: string;
    action?: AuditAction;
    campaignId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (filters.entityType) where.entity_type = filters.entityType;
    if (filters.entityId) where.entity_id = filters.entityId;
    if (filters.action) where.action = filters.action;
    if (filters.campaignId) where.campaign_id = filters.campaignId;
    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo && { lte: filters.dateTo }),
      };
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const auditService = new AuditService();
