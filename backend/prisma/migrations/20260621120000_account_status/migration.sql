-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended');

-- AlterEnum
ALTER TYPE "BusinessStatus" ADD VALUE 'suspended';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'active';
