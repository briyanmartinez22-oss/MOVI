# MOVI — Base de datos (Prisma / PostgreSQL)

## Configuración

| Propiedad | Valor |
|-----------|-------|
| Provider | PostgreSQL (solo — no SQLite en prod) |
| ORM | Prisma 6.x |
| Schema | `backend/prisma/schema.prisma` |
| Migrations | `backend/prisma/migrations/` |
| Seed | `backend/prisma/seed.ts` |
| Local dev | `docker compose up -d` → `postgresql://movi:movi@localhost:5432/movi` |

Deploy ejecuta: `prisma migrate deploy` (Dockerfile CMD).

---

## Enums principales

| Enum | Valores clave |
|------|---------------|
| `UserRole` | `passenger`, `driver`, `owner`, `business`, `admin` |
| `AdminStaffRole` | `SUPER_ADMIN`, `OPS_ADMIN`, `SUPPORT_ADMIN`, `FINANCE_ADMIN`, `COMPLIANCE_ADMIN` |
| `AccountStatus` | `active`, `suspended` |
| `OwnerVerificationStatus` | `pending` → `approved` / `rejected` / `suspended` / `deleted` |
| `VehicleVerificationStatus` | `draft` → `under_review` → `approved` / `rejected` / `suspended` / `deleted` |
| `DriverVerificationStatus` | `pending` → `approved` / `rejected` / `suspended` / `deleted` |
| `BusinessStatus` | `pending`, `approved`, `rejected`, `suspended` |
| `TripLifecycleStatus` | `requested` → `offered` → `accepted` → `driver_arriving` → `driver_arrived` → `trip_started` → `trip_completed` / `cancelled` |
| `ServiceType` | `RIDE`, `DELIVERY`, `PACKAGE`, `CARGO`, `MOVING`, etc. |
| `VehicleType` | `mototaxi`, `sedan`, `pickup`, `camion`, `microbus`, `tuk_tuk_red`, etc. |
| `AuditAction` | `create`, `update`, `delete`, `login`, `approve`, `reject`, `suspend`, etc. |

---

## Modelos y relaciones

### User (tabla central)

```
User
├── id (cuid)
├── fullName, phoneNumber (unique), duiNumber?, email?
├── role (UserRole)
├── accountStatus (active|suspended)
├── phoneVerified, passwordHash?, passwordSetAt?
├── profilePhoto?
└── Relaciones:
    ├── owner? (1:1)
    ├── driver? (1:1)
    ├── business? (1:1)
    ├── adminStaffProfile? (1:1)
    ├── roleAssignments[] (UserRoleAssignment)
    ├── refreshTokens[]
    ├── verificationDocs[]
    ├── payments[], notifications[], pushTokens[]
    ├── supportTickets[], auditLogs[], locationPings[]
```

**Índices:** `phoneNumber` unique.

**Notas:**

- `passwordHash` null = usuario debe usar `set-password` o registro con password
- Admin no usa `passwordHash` — login OTP+DUI
- Teléfono siempre canónico E.164 tras normalización

---

### UserRoleAssignment

Multi-asignación de roles (tabla de soporte, uso limitado en práctica).

```
UserRoleAssignment
├── userId → User
├── role (UserRole)
├── isActive, grantedAt, revokedAt?
└── @@unique([userId, role])
```

---

### AdminStaffProfile

Sub-rol de staff para usuarios `admin`.

```
AdminStaffProfile
├── userId (PK) → User
├── staffRole (AdminStaffRole)
└── createdAt, updatedAt
```

---

### Owner

```
Owner
├── id (cuid)
├── userId (unique) → User
├── firstName, lastName, name, phone, email?, dui
├── documentType (DUI|LICENSE)
├── status (OwnerVerificationStatus)
├── documentsJson (JSON string, default "{}")
├── specialCase?, ownershipProofImage?
├── deletedAt?, deletedBy?, deleteReason?  ← soft delete
└── Relaciones:
    ├── vehicles[]
    ├── drivers[]
    ├── vehicleInvites[]
    └── verificationDocs[]
```

**Soft delete:** `deleteAdminOwner()` setea `status=deleted`, `deletedAt`, no elimina row.

---

### Vehicle

```
Vehicle
├── id (cuid)
├── unitId (unique, auto: MOVI-UNIT-XXXXXX)
├── ownerId → Owner
├── unitNumber, plateNumber (unique)
├── registrationName?, associationName
├── vehicleType (VehicleType)
├── status (VehicleVerificationStatus)
├── documentsJson, photosJson (JSON strings)
├── brand?, model?, year?, color?
├── maxLoadKg?, bedLengthM?, hasCargoCover?
├── passengerCapacity?, cargoCapacity?
├── registrationCard?
├── rejectReason?, autoRejected (boolean)
├── deletedAt?, deletedBy?, deleteReason?
└── Relaciones:
    ├── driver? (1:1 — un vehículo tiene un conductor)
    ├── vehicleInvites[]
    ├── sessions[] (DriverSession)
    ├── assignments[] (VehicleAssignment)
    ├── tripOffers[]
    └── verificationDocs[]
```

**Estados típicos:** `draft` → `documents_uploaded` → `under_review` → `approved`

---

### Driver

```
Driver
├── id (PK = driver public id, e.g. MOVI-DRV-XXXXXX)
├── userId (unique) → User
├── ownerId → Owner
├── vehicleId (unique) → Vehicle
├── firstName, lastName, name, phone, email?
├── birthDate?, status (DriverVerificationStatus)
├── source (INVITE|SELF_OWNER)
├── vehicleInviteId?, inviteCodeUsed?
├── rating (default 5), totalTrips
├── deletedAt?, deletedBy?, deleteReason?
└── Relaciones:
    ├── subscription? (DriverSubscription)
    ├── sessions[], vehicleAssignments[]
    ├── tripOffers[], locationPings[]
    └── verificationDocs[]
```

---

### VehicleInvite

Invitaciones para que conductores se registren en un vehículo.

```
VehicleInvite
├── vehicleId → Vehicle, ownerId → Owner
├── inviteCode (unique, 6 chars)
├── status (ACTIVE|USED|EXPIRED|REVOKED)
├── expiresAt, maxUses, currentUses
└── Relaciones: drivers[], assignments[]
```

---

### VehicleAssignment

Historial de asignación conductor-vehículo.

```
VehicleAssignment
├── driverId → Driver, vehicleId → Vehicle
├── inviteId? → VehicleInvite
├── isActive, assignedAt, unassignedAt?
```

---

### DriverSession

Sesión online del conductor (requerida para ofertar viajes NOW).

```
DriverSession
├── sessionId (PK)
├── driverId → Driver, vehicleId → Vehicle
├── connectedAt, disconnectedAt?
├── durationMinutes?, totalTrips, totalKm, totalCashCollected
├── lastLatitude?, lastLongitude?, lastSpeed?, lastHeading?
└── locationUpdatedAt?
```

---

### Business

```
Business
├── id, userId (unique) → User
├── businessName, businessType, responsibleDui
├── businessPhone, nit?
├── latitude, longitude, addressLabel
├── status (BusinessStatus)
├── rating, totalDeliveries
```

---

### Trip

```
Trip
├── id, passengerId, passengerName
├── driverId?, originJson, destinationJson (JSON)
├── tripType, kind (default "ride")
├── distanceKm, status, lifecycleStatus
├── passengerCount, passengerOfferPrice?
├── description, photoUrisJson, cargoDetailsJson
├── serviceType?, requestType?, deliveryCategory?
├── businessId?, businessName?
├── acceptedOfferId?
├── driverLat?, driverLng?
├── requestMode (NOW|SCHEDULED), scheduledAt?, offerDeadlineAt?
├── pickupLatitude?, pickupLongitude?
├── requiredVehicleType?, scheduledStatus?
├── cancelledBy?, startedAt?, completedAt?, cancelledAt?
└── Relaciones:
    ├── offers[] (TripOffer)
    ├── chatMessages[], delivery?, payments[]
    └── locationPings[]
```

**Índices:** `passengerId`, `driverId`, `lifecycleStatus`, `serviceType`, `requestMode`, `scheduledAt`

---

### TripOffer

```
TripOffer
├── tripId → Trip, driverId → Driver, vehicleId? → Vehicle
├── driverName, price, etaMinutes
├── status (pending|accepted|rejected|expired|not_selected)
```

---

### Delivery

Extensión de Trip para entregas.

```
Delivery
├── tripId (unique) → Trip
├── recipientName?, recipientPhone?
├── pickupNotes?, deliveryNotes?
├── packageCount, weightKg?, dimensionsJson
├── proofPhotoUrl?, signatureUrl?
```

---

### DriverSubscription

Suscripción mensual del conductor ($7 USD default).

```
DriverSubscription
├── driverId (unique) → Driver
├── status (trial_until_next_month|active|past_due|suspended)
├── monthlyAmountUsd (default 7)
├── registeredAt, trialEndsAt, nextBillingAt
├── paymentMethod?, paymentProvider?, lastPaidAt?
```

---

### VerificationDocument

Documentos subidos para verificación.

```
VerificationDocument
├── userId?, ownerId?, driverId?, vehicleId?
├── documentType (dui_front, license_front, vehicle_registration, selfie, etc.)
├── fileUrl, storageKey?, mimeType?, sizeBytes?
├── status (pending|under_review|approved|rejected|expired)
├── reviewedBy?, reviewNotes?, metadataJson
├── uploadedAt, reviewedAt?, expiresAt?
```

---

### AuditLog

```
AuditLog
├── userId? → User, actorRole?
├── action (AuditAction)
├── entityType, entityId?
├── changesJson, beforeJson, afterJson
├── ipAddress?, userAgent?
├── createdAt
```

**Índices:** `userId`, `[entityType, entityId]`, `action`, `createdAt`

---

### OperationalAlert

Alertas del centro de operaciones.

```
OperationalAlert
├── type (no_driver_timeout, sos_active, payment_failed, etc.)
├── severity (warning|critical), status (open|acknowledged|resolved)
├── entityType, entityId, message, metadataJson
├── acknowledgedAt?, acknowledgedBy?, resolvedAt?, resolvedBy?
```

---

### SupportTicket / SupportTicketMessage

Tickets de soporte con mensajes y prioridad.

---

### Payment

Pagos vinculados a usuario y opcionalmente a trip.

---

### Notification / PushToken

Notificaciones in-app y tokens Expo/Firebase push.

---

### LocationPing

Pings de ubicación de usuarios, conductores y viajes.

---

### ChatMessage / TripRating

Chat por viaje y ratings bidireccionales.

---

### TripHistory / DeliveryHistory

Tablas de historial archivado (datos completados).

---

### RefreshToken / OtpChallenge

Tokens de refresh (hash) y challenges OTP locales.

---

## Diagrama de relaciones core

```mermaid
erDiagram
    User ||--o| Owner : has
    User ||--o| Driver : has
    User ||--o| Business : has
    User ||--o| AdminStaffProfile : has
    Owner ||--|{ Vehicle : owns
    Owner ||--|{ Driver : employs
    Vehicle ||--o| Driver : assigned
    Vehicle ||--|{ VehicleInvite : has
    Driver ||--|{ DriverSession : sessions
    Driver ||--o| DriverSubscription : subscription
    Trip ||--|{ TripOffer : offers
    Trip ||--o| Delivery : delivery
    Driver ||--|{ TripOffer : makes
```

---

## Queries importantes para debugging

### Verificar owner login

```sql
SELECT id, phoneNumber, role, passwordHash IS NOT NULL AS has_password, accountStatus
FROM "User"
WHERE phoneNumber LIKE '%70328885%';
```

### Owners no eliminados vs eliminados

```sql
SELECT id, name, phone, status, deletedAt
FROM "Owner"
ORDER BY createdAt DESC
LIMIT 20;
```

### Vehículos rechazados

```sql
SELECT plateNumber, status, rejectReason, autoRejected, registrationName
FROM "Vehicle"
WHERE status = 'rejected'
ORDER BY updatedAt DESC;
```

### Audit log reciente

```sql
SELECT action, entityType, entityId, actorRole, createdAt
FROM "AuditLog"
ORDER BY createdAt DESC
LIMIT 20;
```

---

## Migraciones recientes relevantes

- `20260623110000_vehicle_admin_review` — columna `autoRejected` en Vehicle
- Soft delete fields en Owner, Vehicle, Driver (`deletedAt`, `deletedBy`, `deleteReason`)
