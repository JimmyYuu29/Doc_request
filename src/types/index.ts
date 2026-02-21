// ── Enums ──

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum RequestStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  IN_PROGRESS = 'IN_PROGRESS',
  PARTIAL = 'PARTIAL',
  SUBMITTED = 'SUBMITTED',
  REVIEW = 'REVIEW',
  READY_TO_CLOSE = 'READY_TO_CLOSE',
  CLOSED = 'CLOSED',
  OVERDUE = 'OVERDUE',
}

export enum EvidenceStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
}

export enum EvidenceType {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  WORD = 'WORD',
  IMAGE = 'IMAGE',
  EMAIL = 'EMAIL',
  SCREENSHOT = 'SCREENSHOT',
  ACCESS = 'ACCESS',
  MEETING_MINUTES = 'MEETING_MINUTES',
  OTHER = 'OTHER',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export enum AuditAction {
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED',
  CAMPAIGN_ACTIVATED = 'CAMPAIGN_ACTIVATED',
  CAMPAIGN_COMPLETED = 'CAMPAIGN_COMPLETED',
  CAMPAIGN_ARCHIVED = 'CAMPAIGN_ARCHIVED',
  REQUEST_CREATED = 'REQUEST_CREATED',
  REQUEST_SENT = 'REQUEST_SENT',
  REQUEST_REMINDER_SENT = 'REQUEST_REMINDER_SENT',
  REQUEST_ESCALATED = 'REQUEST_ESCALATED',
  REQUEST_CLOSED = 'REQUEST_CLOSED',
  EVIDENCE_SUBMITTED = 'EVIDENCE_SUBMITTED',
  EVIDENCE_VALIDATED = 'EVIDENCE_VALIDATED',
  EVIDENCE_REJECTED = 'EVIDENCE_REJECTED',
  SUBMISSION_CREATED = 'SUBMISSION_CREATED',
  TOKEN_GENERATED = 'TOKEN_GENERATED',
  TOKEN_VALIDATED = 'TOKEN_VALIDATED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  OTP_SENT = 'OTP_SENT',
  OTP_VALIDATED = 'OTP_VALIDATED',
  OTP_FAILED = 'OTP_FAILED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_ARCHIVED_SP = 'FILE_ARCHIVED_SP',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
}

export enum EntityType {
  CAMPAIGN = 'CAMPAIGN',
  REQUEST = 'REQUEST',
  EVIDENCE = 'EVIDENCE',
  SUBMISSION = 'SUBMISSION',
  TOKEN = 'TOKEN',
  OTP = 'OTP',
  FILE = 'FILE',
  USER = 'USER',
}

// ── DTO Interfaces ──

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface PortalTokenPayload {
  sub: string; // request_id
  email: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface ReminderPolicy {
  frequency_days: number;
  max_reminders: number;
  start_after_days: number;
}

export interface EscalationPolicy {
  levels: {
    level: number;
    after_reminders: number;
    cc_delegate: boolean;
    cc_superior: boolean;
    superior_email?: string;
  }[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Express request extensions
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      portalSession?: {
        requestId: string;
        email: string;
        tokenJti: string;
      };
    }
  }
}
