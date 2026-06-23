-- User password fields for phone+password authentication
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3);
