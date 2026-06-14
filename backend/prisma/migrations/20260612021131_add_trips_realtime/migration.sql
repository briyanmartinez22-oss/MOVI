-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passengerId" TEXT NOT NULL,
    "passengerName" TEXT NOT NULL,
    "driverId" TEXT,
    "originJson" TEXT NOT NULL,
    "destinationJson" TEXT NOT NULL,
    "tripType" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'ride',
    "distanceKm" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'searching',
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'requested',
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "passengerOfferPrice" REAL,
    "description" TEXT NOT NULL DEFAULT '',
    "photoUrisJson" TEXT NOT NULL DEFAULT '[]',
    "serviceType" TEXT,
    "requestType" TEXT,
    "deliveryCategory" TEXT,
    "businessId" TEXT,
    "businessName" TEXT,
    "acceptedOfferId" TEXT,
    "driverLat" REAL,
    "driverLng" REAL,
    "cancelledBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME
);

-- CreateTable
CREATE TABLE "TripOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "etaMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripOffer_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Trip_passengerId_idx" ON "Trip"("passengerId");

-- CreateIndex
CREATE INDEX "Trip_driverId_idx" ON "Trip"("driverId");

-- CreateIndex
CREATE INDEX "Trip_lifecycleStatus_idx" ON "Trip"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "TripOffer_tripId_idx" ON "TripOffer"("tripId");

-- CreateIndex
CREATE INDEX "TripOffer_driverId_idx" ON "TripOffer"("driverId");

-- CreateIndex
CREATE INDEX "ChatMessage_tripId_idx" ON "ChatMessage"("tripId");
