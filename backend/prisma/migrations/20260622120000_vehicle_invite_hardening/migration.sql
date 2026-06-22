-- VehicleInvite hardening: REVOKED status, currentUses, updatedAt

ALTER TYPE "VehicleInviteStatus" RENAME VALUE 'CANCELLED' TO 'REVOKED';

ALTER TABLE "VehicleInvite" RENAME COLUMN "usedCount" TO "currentUses";

ALTER TABLE "VehicleInvite" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "VehicleInvite" RENAME COLUMN "cancelledAt" TO "revokedAt";

UPDATE "VehicleInvite" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'revoke';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'regenerate';
