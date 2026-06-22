-- MOVI consolidated owner/vehicle/driver + VehicleInvite
-- CreateEnum
CREATE TYPE "OwnerDocumentType" AS ENUM ('DUI', 'LICENSE');
CREATE TYPE "DriverSource" AS ENUM ('INVITE', 'SELF_OWNER');
CREATE TYPE "VehicleInviteStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "OwnerVerificationStatus" ADD VALUE IF NOT EXISTS 'deleted';
ALTER TYPE "VehicleVerificationStatus" ADD VALUE IF NOT EXISTS 'deleted';
ALTER TYPE "DriverVerificationStatus" ADD VALUE IF NOT EXISTS 'deleted';

-- User email
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Owner extensions
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS "documentType" "OwnerDocumentType" NOT NULL DEFAULT 'DUI';
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS "deleteReason" TEXT;

-- Vehicle soft delete
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "deleteReason" TEXT;

-- Driver extensions
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "source" "DriverSource" NOT NULL DEFAULT 'INVITE';
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "vehicleInviteId" TEXT;
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "deleteReason" TEXT;

-- VehicleAssignment invite link
ALTER TABLE "VehicleAssignment" ADD COLUMN IF NOT EXISTS "inviteId" TEXT;

-- VehicleInvite table
CREATE TABLE IF NOT EXISTS "VehicleInvite" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "status" "VehicleInviteStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  "usedByDriverId" TEXT,
  CONSTRAINT "VehicleInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleInvite_inviteCode_key" ON "VehicleInvite"("inviteCode");
CREATE INDEX IF NOT EXISTS "VehicleInvite_vehicleId_idx" ON "VehicleInvite"("vehicleId");
CREATE INDEX IF NOT EXISTS "VehicleInvite_ownerId_idx" ON "VehicleInvite"("ownerId");
CREATE INDEX IF NOT EXISTS "VehicleInvite_status_idx" ON "VehicleInvite"("status");
CREATE INDEX IF NOT EXISTS "VehicleInvite_expiresAt_idx" ON "VehicleInvite"("expiresAt");

ALTER TABLE "VehicleInvite" DROP CONSTRAINT IF EXISTS "VehicleInvite_vehicleId_fkey";
ALTER TABLE "VehicleInvite" ADD CONSTRAINT "VehicleInvite_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleInvite" DROP CONSTRAINT IF EXISTS "VehicleInvite_ownerId_fkey";
ALTER TABLE "VehicleInvite" ADD CONSTRAINT "VehicleInvite_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Driver" DROP CONSTRAINT IF EXISTS "Driver_vehicleInviteId_fkey";
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_vehicleInviteId_fkey"
  FOREIGN KEY ("vehicleInviteId") REFERENCES "VehicleInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VehicleAssignment" DROP CONSTRAINT IF EXISTS "VehicleAssignment_inviteId_fkey";
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_inviteId_fkey"
  FOREIGN KEY ("inviteId") REFERENCES "VehicleInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "VehicleAssignment_inviteId_idx" ON "VehicleAssignment"("inviteId");

-- Migrate legacy InviteCode rows if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'InviteCode') THEN
    INSERT INTO "VehicleInvite" (
      "id", "vehicleId", "ownerId", "inviteCode", "status", "expiresAt",
      "maxUses", "usedCount", "createdBy", "createdAt", "usedByDriverId"
    )
    SELECT
      gen_random_uuid()::text,
      ic."vehicleId",
      ic."ownerId",
      ic."code",
      CASE WHEN ic."usedBy" IS NOT NULL THEN 'USED'::"VehicleInviteStatus" ELSE 'ACTIVE'::"VehicleInviteStatus" END,
      ic."createdAt" + interval '7 days',
      1,
      CASE WHEN ic."usedBy" IS NOT NULL THEN 1 ELSE 0 END,
      ic."ownerId",
      ic."createdAt",
      ic."usedBy"
    FROM "InviteCode" ic
    ON CONFLICT ("inviteCode") DO NOTHING;

    DROP TABLE IF EXISTS "InviteCode";
  END IF;
END $$;

-- Backfill owner names from name
UPDATE "Owner" SET "firstName" = split_part("name", ' ', 1), "lastName" = COALESCE(substring("name" from position(' ' in "name") + 1), '')
WHERE "firstName" = '' AND "name" <> '';

UPDATE "Driver" SET "firstName" = split_part("name", ' ', 1), "lastName" = COALESCE(substring("name" from position(' ' in "name") + 1), '')
WHERE "firstName" = '' AND "name" <> '';
