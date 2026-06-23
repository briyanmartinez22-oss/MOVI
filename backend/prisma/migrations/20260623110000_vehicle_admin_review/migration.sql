-- Vehicle admin review: incomplete status, reject reason, auto-reject flag
ALTER TYPE "VehicleVerificationStatus" ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "rejectReason" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "autoRejected" BOOLEAN NOT NULL DEFAULT false;
