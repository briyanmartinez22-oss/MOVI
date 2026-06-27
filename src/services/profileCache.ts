import {
  AuthUser,
  BusinessProfile,
  DriverProfileRecord,
  DriverSession,
  DriverSubscription,
  InviteCode,
  Owner,
  OwnerDocuments,
  TripHistoryRecord,
  Vehicle,
} from '../types/models';

function mergeOwnerDocuments(
  base?: OwnerDocuments | null,
  incoming?: OwnerDocuments | null
): OwnerDocuments {
  const merged: OwnerDocuments = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(incoming ?? {})) {
    if (typeof value === 'string' && value.trim()) {
      merged[key as keyof OwnerDocuments] = value;
    }
  }
  return merged;
}

let cachedUser: AuthUser | null = null;
let cachedOwner: Owner | null = null;
let cachedDriver: DriverProfileRecord | null = null;
let cachedBusiness: BusinessProfile | null = null;
let cachedVehicles: Vehicle[] = [];
let cachedOwnerDrivers: DriverProfileRecord[] = [];
let cachedSubscription: DriverSubscription | null = null;
let cachedTripHistory: TripHistoryRecord[] = [];
let cachedDriverSessions: DriverSession[] = [];
let cachedInvitePreview: {
  code: InviteCode;
  vehicle: Vehicle;
  owner: Owner;
} | null = null;

export function setProfileCache(data: {
  user?: AuthUser | null;
  owner?: Owner | null;
  driver?: DriverProfileRecord | null;
  business?: BusinessProfile | null;
  vehicles?: Vehicle[];
  ownerDrivers?: DriverProfileRecord[];
  subscription?: DriverSubscription | null;
  tripHistory?: TripHistoryRecord[];
  driverSessions?: DriverSession[];
}): void {
  if (data.user !== undefined) cachedUser = data.user;
  if (data.owner !== undefined) {
    if (data.owner && cachedOwner && cachedOwner.id === data.owner.id) {
      cachedOwner = {
        ...cachedOwner,
        ...data.owner,
        documents: mergeOwnerDocuments(cachedOwner.documents, data.owner.documents),
      };
    } else {
      cachedOwner = data.owner;
    }
  }
  if (data.driver !== undefined) cachedDriver = data.driver;
  if (data.business !== undefined) cachedBusiness = data.business;
  if (data.vehicles !== undefined) cachedVehicles = data.vehicles;
  if (data.ownerDrivers !== undefined) cachedOwnerDrivers = data.ownerDrivers;
  if (data.subscription !== undefined) cachedSubscription = data.subscription;
  if (data.tripHistory !== undefined) cachedTripHistory = data.tripHistory;
  if (data.driverSessions !== undefined) cachedDriverSessions = data.driverSessions;
}

export function setInvitePreviewCache(
  preview: { code: InviteCode; vehicle: Vehicle; owner: Owner } | null
): void {
  cachedInvitePreview = preview;
}

export function resolveCurrentProfiles(): {
  user: AuthUser | null;
  owner: Owner | null;
  driver: DriverProfileRecord | null;
  business: BusinessProfile | null;
} {
  return {
    user: cachedUser,
    owner: cachedOwner,
    driver: cachedDriver,
    business: cachedBusiness,
  };
}

export function getCachedVehicles(): Vehicle[] {
  return cachedVehicles;
}

export function getCachedOwnerDrivers(): DriverProfileRecord[] {
  return cachedOwnerDrivers;
}

export function getCachedSubscription(): DriverSubscription | null {
  return cachedSubscription;
}

export function getCachedTripHistory(): TripHistoryRecord[] {
  return cachedTripHistory;
}

export function getCachedDriverSessions(): DriverSession[] {
  return cachedDriverSessions;
}

export function getInvitePreviewFromCache(code: string): {
  code: InviteCode;
  vehicle: Vehicle;
  owner: Owner;
} | null {
  if (!cachedInvitePreview) return null;
  if (cachedInvitePreview.code.code.toUpperCase() !== code.toUpperCase()) return null;
  return cachedInvitePreview;
}

export function clearProfileCache(): void {
  cachedUser = null;
  cachedOwner = null;
  cachedDriver = null;
  cachedBusiness = null;
  cachedVehicles = [];
  cachedOwnerDrivers = [];
  cachedSubscription = null;
  cachedTripHistory = [];
  cachedDriverSessions = [];
  cachedInvitePreview = null;
}
