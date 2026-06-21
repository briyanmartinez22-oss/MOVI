-- Allow passengers without DUI (nullable duiNumber)
ALTER TABLE "User" ALTER COLUMN "duiNumber" DROP NOT NULL;
