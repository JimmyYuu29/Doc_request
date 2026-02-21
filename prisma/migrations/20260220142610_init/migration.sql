-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'PARTIAL', 'SUBMITTED', 'REVIEW', 'READY_TO_CLOSE', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('PDF', 'EXCEL', 'WORD', 'IMAGE', 'EMAIL', 'SCREENSHOT', 'ACCESS', 'MEETING_MINUTES', 'OTHER');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CAMPAIGN', 'REQUEST', 'EVIDENCE', 'SUBMISSION', 'TOKEN', 'OTP', 'FILE', 'USER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CAMPAIGN_CREATED', 'CAMPAIGN_UPDATED', 'CAMPAIGN_ACTIVATED', 'CAMPAIGN_COMPLETED', 'CAMPAIGN_ARCHIVED', 'REQUEST_CREATED', 'REQUEST_SENT', 'REQUEST_REMINDER_SENT', 'REQUEST_ESCALATED', 'REQUEST_CLOSED', 'EVIDENCE_SUBMITTED', 'EVIDENCE_VALIDATED', 'EVIDENCE_REJECTED', 'SUBMISSION_CREATED', 'TOKEN_GENERATED', 'TOKEN_VALIDATED', 'TOKEN_EXPIRED', 'OTP_SENT', 'OTP_VALIDATED', 'OTP_FAILED', 'FILE_UPLOADED', 'FILE_ARCHIVED_SP', 'USER_LOGIN', 'USER_LOGOUT');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "department" TEXT,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "campaign_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "description" TEXT,
    "owner_user_id" UUID NOT NULL,
    "backup_user_id" UUID,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reminder_policy" JSONB,
    "escalation_policy" JSONB,
    "email_template" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("campaign_id")
);

-- CreateTable
CREATE TABLE "requests" (
    "request_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "cc_emails" JSONB,
    "delegate_email" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "token_hash" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_at" TIMESTAMP(3),
    "escalation_level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "evidence_templates" (
    "template_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "type" "EvidenceType" NOT NULL,
    "default_instructions" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_templates_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "evidence_items" (
    "evidence_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "template_id" UUID,
    "name" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "file_sp_path" TEXT,
    "file_sp_url" TEXT,
    "file_size_bytes" INTEGER,
    "file_mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_items_pkey" PRIMARY KEY ("evidence_id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "submission_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "submitted_by_email" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "notes" TEXT,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("submission_id")
);

-- CreateTable
CREATE TABLE "submission_files" (
    "file_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "original_filename" TEXT NOT NULL,
    "stored_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sp_path" TEXT,
    "sp_url" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_files_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" UUID NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor_email" TEXT NOT NULL,
    "actor_ip" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "campaign_id" UUID,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_owner_user_id_idx" ON "campaigns"("owner_user_id");

-- CreateIndex
CREATE INDEX "campaigns_control_code_idx" ON "campaigns"("control_code");

-- CreateIndex
CREATE INDEX "requests_campaign_id_idx" ON "requests"("campaign_id");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE INDEX "requests_deadline_idx" ON "requests"("deadline");

-- CreateIndex
CREATE INDEX "requests_recipient_email_idx" ON "requests"("recipient_email");

-- CreateIndex
CREATE INDEX "requests_status_deadline_reminder_count_idx" ON "requests"("status", "deadline", "reminder_count");

-- CreateIndex
CREATE INDEX "evidence_items_request_id_idx" ON "evidence_items"("request_id");

-- CreateIndex
CREATE INDEX "evidence_items_status_idx" ON "evidence_items"("status");

-- CreateIndex
CREATE INDEX "submissions_request_id_idx" ON "submissions"("request_id");

-- CreateIndex
CREATE INDEX "submission_files_submission_id_idx" ON "submission_files"("submission_id");

-- CreateIndex
CREATE INDEX "submission_files_evidence_id_idx" ON "submission_files"("evidence_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_campaign_id_idx" ON "audit_logs"("campaign_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_backup_user_id_fkey" FOREIGN KEY ("backup_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("campaign_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "evidence_templates"("template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("submission_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence_items"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;
