-- CreateTable
CREATE TABLE "TripRating" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "raterRole" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "rateeRole" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripRating_tripId_idx" ON "TripRating"("tripId");

-- CreateIndex
CREATE INDEX "TripRating_rateeId_idx" ON "TripRating"("rateeId");

-- CreateIndex
CREATE UNIQUE INDEX "TripRating_tripId_raterId_raterRole_key" ON "TripRating"("tripId", "raterId", "raterRole");
