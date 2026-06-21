-- AdminStaffRole and alert enums
CREATE TYPE "AdminStaffRole" AS ENUM ('SUPER_ADMIN', 'OPS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN', 'COMPLIANCE_ADMIN');
CREATE TYPE "OperationalAlertType" AS ENUM (
  'no_driver_timeout', 'driver_stopped', 'trip_no_movement', 'eta_exceeded',
  'repeated_cancellations', 'otp_failed_repeated', 'driver_disconnected',
  'saturated_zone', 'sos_active', 'payment_failed', 'no_match', 'sla', 'cancellation'
);
CREATE TYPE "OperationalAlertSeverity" AS ENUM ('warning', 'critical');
CREATE TYPE "OperationalAlertStatus" AS ENUM ('open', 'acknowledged', 'resolved');

-- Extend AuditAction
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'dispatch';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'reassign';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'suspend';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'unsuspend';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'refund';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ack_alert';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'resolve_alert';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'role_change';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ticket_create';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ticket_update';

-- Extend SupportTicketStatus
ALTER TYPE "SupportTicketStatus" ADD VALUE IF NOT EXISTS 'assigned';

-- Extend NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'sos';

-- SupportTicket columns
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "tripId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "driverId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
CREATE INDEX IF NOT EXISTS "SupportTicket_tripId_idx" ON "SupportTicket"("tripId");
CREATE INDEX IF NOT EXISTS "SupportTicket_driverId_idx" ON "SupportTicket"("driverId");

-- AuditLog columns
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorRole" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "beforeJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "afterJson" TEXT NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");

CREATE TABLE "SupportTicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicketMessage_ticketId_idx" ON "SupportTicketMessage"("ticketId");
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OperationalAlert" (
  "id" TEXT NOT NULL,
  "type" "OperationalAlertType" NOT NULL,
  "severity" "OperationalAlertSeverity" NOT NULL,
  "status" "OperationalAlertStatus" NOT NULL DEFAULT 'open',
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  CONSTRAINT "OperationalAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OperationalAlert_status_idx" ON "OperationalAlert"("status");
CREATE INDEX "OperationalAlert_type_entityId_idx" ON "OperationalAlert"("type", "entityId");
CREATE INDEX "OperationalAlert_createdAt_idx" ON "OperationalAlert"("createdAt");

CREATE TABLE "AdminStaffProfile" (
  "userId" TEXT NOT NULL,
  "staffRole" "AdminStaffRole" NOT NULL DEFAULT 'SUPER_ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminStaffProfile_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "AdminStaffProfile" ADD CONSTRAINT "AdminStaffProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
