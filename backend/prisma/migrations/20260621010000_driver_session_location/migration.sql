-- AlterTable
ALTER TABLE "DriverSession" ADD COLUMN "lastLatitude" DOUBLE PRECISION;
ALTER TABLE "DriverSession" ADD COLUMN "lastLongitude" DOUBLE PRECISION;
ALTER TABLE "DriverSession" ADD COLUMN "lastSpeed" DOUBLE PRECISION;
ALTER TABLE "DriverSession" ADD COLUMN "lastHeading" DOUBLE PRECISION;
ALTER TABLE "DriverSession" ADD COLUMN "locationUpdatedAt" TIMESTAMP(3);
