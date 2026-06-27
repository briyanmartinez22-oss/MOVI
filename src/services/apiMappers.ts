import type {
  DriverProfileRecord,
  DriverSubscription,
  Owner,
  OwnerDocuments,
  Vehicle,
  VehicleDocuments,
} from '../types/models';

function toIso(value: string | Date): string {
  return typeof value === 'string' ? value : value.toISOString();
}

function parseDocuments(value: unknown): VehicleDocuments {
  if (value && typeof value === 'object') return value as VehicleDocuments;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as VehicleDocuments;
    } catch {
      return {};
    }
  }
  return {};
}

export function mapVehicle(raw: Record<string, unknown>): Vehicle {
  const driver = raw.driver as { id?: string } | null | undefined;
  return {
    vehicleId: String(raw.vehicleId ?? raw.id ?? ''),
    unitId: String(raw.unitId ?? ''),
    ownerId: String(raw.ownerId ?? ''),
    unitNumber: String(raw.unitNumber ?? ''),
    plateNumber: String(raw.plateNumber ?? ''),
    registrationName: raw.registrationName ? String(raw.registrationName) : undefined,
    associationName: String(raw.associationName ?? ''),
    vehicleType: raw.vehicleType as Vehicle['vehicleType'],
    status: raw.status as Vehicle['status'],
    documents: parseDocuments(raw.documents ?? raw.documentsJson),
    driverId: raw.driverId ? String(raw.driverId) : driver?.id,
    maxLoadKg: typeof raw.maxLoadKg === 'number' ? raw.maxLoadKg : undefined,
    bedLengthM: typeof raw.bedLengthM === 'number' ? raw.bedLengthM : undefined,
    hasCargoCover: typeof raw.hasCargoCover === 'boolean' ? raw.hasCargoCover : undefined,
    createdAt: toIso((raw.createdAt as string | Date) ?? new Date().toISOString()),
  };
}

function parseOwnerDocuments(value: unknown): OwnerDocuments {
  if (value && typeof value === 'object') return value as OwnerDocuments;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as OwnerDocuments;
    } catch {
      return {};
    }
  }
  return {};
}

export function mapOwner(
  raw: Record<string, unknown> | null | undefined,
  userIdFallback?: string
): Owner | null {
  if (!raw) return null;

  const userId = String(raw.userId ?? userIdFallback ?? '').trim();
  if (!String(raw.id ?? '').trim() || !userId) {
    return null;
  }

  return {
    id: String(raw.id),
    userId,
    name: String(raw.name ?? ''),
    phone: String(raw.phone ?? ''),
    dui: String(raw.dui ?? ''),
    email: raw.email ? String(raw.email) : undefined,
    documentType:
      raw.documentType === 'LICENSE' || raw.documentType === 'DUI'
        ? raw.documentType
        : undefined,
    status: raw.status as Owner['status'],
    documents: parseOwnerDocuments(raw.documents ?? raw.documentsJson),
    specialCase: raw.specialCase as Owner['specialCase'],
    ownershipProofImage: raw.ownershipProofImage
      ? String(raw.ownershipProofImage)
      : undefined,
    createdAt: toIso((raw.createdAt as string | Date) ?? new Date().toISOString()),
  };
}

export function mapDriver(raw: Record<string, unknown>): DriverProfileRecord {
  return {
    id: String(raw.id ?? ''),
    userId: String(raw.userId ?? ''),
    ownerId: String(raw.ownerId ?? ''),
    vehicleId: String(raw.vehicleId ?? ''),
    name: String(raw.name ?? ''),
    phone: String(raw.phone ?? ''),
    status: raw.status as DriverProfileRecord['status'],
    inviteCodeUsed: raw.inviteCodeUsed ? String(raw.inviteCodeUsed) : undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : 5,
    totalTrips: typeof raw.totalTrips === 'number' ? raw.totalTrips : 0,
    createdAt: toIso((raw.createdAt as string | Date) ?? new Date().toISOString()),
    licenseFront: raw.licenseFront ? String(raw.licenseFront) : undefined,
    licenseBack: raw.licenseBack ? String(raw.licenseBack) : undefined,
    approvalStatus: raw.approvalStatus ? String(raw.approvalStatus) : undefined,
  };
}

export function mapSubscription(raw: Record<string, unknown>): DriverSubscription {
  return {
    id: String(raw.id ?? `sub-${raw.driverId}`),
    driverId: String(raw.driverId ?? ''),
    status: raw.status as DriverSubscription['status'],
    monthlyAmountUsd: typeof raw.monthlyAmountUsd === 'number' ? raw.monthlyAmountUsd : 7,
    registeredAt: toIso((raw.registeredAt as string | Date) ?? new Date().toISOString()),
    trialEndsAt: toIso((raw.trialEndsAt as string | Date) ?? new Date().toISOString()),
    nextBillingAt: toIso((raw.nextBillingAt as string | Date) ?? new Date().toISOString()),
    paymentMethod: raw.paymentMethod as DriverSubscription['paymentMethod'],
    paymentProvider: raw.paymentProvider as DriverSubscription['paymentProvider'],
    lastPaidAt: raw.lastPaidAt ? toIso(raw.lastPaidAt as string | Date) : undefined,
  };
}
