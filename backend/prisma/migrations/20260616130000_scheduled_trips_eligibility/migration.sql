-- CreateEnum
CREATE TYPE "RequestMode" AS ENUM ('NOW', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ScheduledStatus" AS ENUM ('open', 'confirmed');

-- AlterEnum
ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'not_selected';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "requestMode" "RequestMode" NOT NULL DEFAULT 'NOW';
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "offerDeadlineAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "pickupLatitude" DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "pickupLongitude" DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "requiredVehicleType" "VehicleType";
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "scheduledStatus" "ScheduledStatus";

CREATE INDEX IF NOT EXISTS "Trip_requestMode_idx" ON "Trip"("requestMode");
CREATE INDEX IF NOT EXISTS "Trip_scheduledStatus_idx" ON "Trip"("scheduledStatus");
CREATE INDEX IF NOT EXISTS "Trip_scheduledAt_idx" ON "Trip"("scheduledAt");
