-- AlterTable: Vehicle — expanded production fields
ALTER TABLE "Vehicle" ADD COLUMN "brand" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "model" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "year" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "color" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "passengerCapacity" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "cargoCapacity" REAL;
ALTER TABLE "Vehicle" ADD COLUMN "photosJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Vehicle" ADD COLUMN "registrationCard" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Trip — cargo fields and typed serviceType (stored as TEXT enum)
ALTER TABLE "Trip" ADD COLUMN "cargoDetailsJson" TEXT NOT NULL DEFAULT '{}';

-- AlterTable: TripOffer — vehicle linkage
ALTER TABLE "TripOffer" ADD COLUMN "vehicleId" TEXT;

-- CreateTable: UserRoleAssignment
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: RefreshToken
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: VerificationDocument
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "ownerId" TEXT,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "expiresAt" DATETIME,
    CONSTRAINT "VerificationDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VerificationDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VerificationDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VerificationDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: VehicleAssignment
CREATE TABLE "VehicleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" DATETIME,
    "notes" TEXT,
    CONSTRAINT "VehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Delivery
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "pickupNotes" TEXT,
    "deliveryNotes" TEXT,
    "packageCount" INTEGER NOT NULL DEFAULT 1,
    "weightKg" REAL,
    "dimensionsJson" TEXT NOT NULL DEFAULT '{}',
    "proofPhotoUrl" TEXT,
    "signatureUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: LocationPing
CREATE TABLE "LocationPing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "driverId" TEXT,
    "tripId" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "accuracy" REAL,
    "heading" REAL,
    "speed" REAL,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LocationPing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationPing_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationPing_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tripId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "providerCustomerId" TEXT,
    "providerIntentId" TEXT,
    "providerChargeId" TEXT,
    "providerMetadataJson" TEXT NOT NULL DEFAULT '{}',
    "failureReason" TEXT,
    "paidAt" DATETIME,
    "refundedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dataJson" TEXT NOT NULL DEFAULT '{}',
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: PushToken
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: SupportTicket
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT,
    "assignedTo" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changesJson" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- TripOffer foreign keys (driver + vehicle)
CREATE INDEX "TripOffer_vehicleId_idx" ON "TripOffer"("vehicleId");
CREATE INDEX "Trip_serviceType_idx" ON "Trip"("serviceType");

CREATE UNIQUE INDEX "UserRoleAssignment_userId_role_key" ON "UserRoleAssignment"("userId", "role");
CREATE INDEX "UserRoleAssignment_userId_idx" ON "UserRoleAssignment"("userId");
CREATE INDEX "UserRoleAssignment_role_idx" ON "UserRoleAssignment"("role");

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

CREATE INDEX "VerificationDocument_userId_idx" ON "VerificationDocument"("userId");
CREATE INDEX "VerificationDocument_ownerId_idx" ON "VerificationDocument"("ownerId");
CREATE INDEX "VerificationDocument_driverId_idx" ON "VerificationDocument"("driverId");
CREATE INDEX "VerificationDocument_vehicleId_idx" ON "VerificationDocument"("vehicleId");
CREATE INDEX "VerificationDocument_status_idx" ON "VerificationDocument"("status");

CREATE INDEX "VehicleAssignment_driverId_idx" ON "VehicleAssignment"("driverId");
CREATE INDEX "VehicleAssignment_vehicleId_idx" ON "VehicleAssignment"("vehicleId");
CREATE INDEX "VehicleAssignment_isActive_idx" ON "VehicleAssignment"("isActive");

CREATE UNIQUE INDEX "Delivery_tripId_key" ON "Delivery"("tripId");

CREATE INDEX "LocationPing_userId_idx" ON "LocationPing"("userId");
CREATE INDEX "LocationPing_driverId_idx" ON "LocationPing"("driverId");
CREATE INDEX "LocationPing_tripId_idx" ON "LocationPing"("tripId");
CREATE INDEX "LocationPing_createdAt_idx" ON "LocationPing"("createdAt");

CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_tripId_idx" ON "Payment"("tripId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_provider_providerPaymentId_idx" ON "Payment"("provider", "providerPaymentId");

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");
CREATE INDEX "PushToken_isActive_idx" ON "PushToken"("isActive");

CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Redefine TripOffer to add FK constraints (SQLite table rebuild)
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TripOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverName" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "etaMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripOffer_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripOffer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripOffer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TripOffer" ("id", "tripId", "driverId", "vehicleId", "driverName", "price", "etaMinutes", "status", "createdAt")
SELECT "id", "tripId", "driverId", "vehicleId", "driverName", "price", "etaMinutes", "status", "createdAt" FROM "TripOffer";
DROP TABLE "TripOffer";
ALTER TABLE "new_TripOffer" RENAME TO "TripOffer";
CREATE INDEX "TripOffer_tripId_idx" ON "TripOffer"("tripId");
CREATE INDEX "TripOffer_driverId_idx" ON "TripOffer"("driverId");
CREATE INDEX "TripOffer_vehicleId_idx" ON "TripOffer"("vehicleId");
PRAGMA foreign_keys=ON;
