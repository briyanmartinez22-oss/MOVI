-- AlterTable
ALTER TABLE "VerificationDocument" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "VerificationDocument" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "VerificationDocument" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;
