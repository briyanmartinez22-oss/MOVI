/**
 * Bridge between mockStore (demo) and API + profileCache (real backend).
 * Screens should import from here instead of mockStore directly.
 */
import type {
  BusinessProfile,
  DriverProfileRecord,
  DriverSession,
  DriverSubscription,
  Owner,
  TripHistoryRecord,
  Vehicle,
} from '../types/models';
import { useMockApi } from './api/config';
import * as api from './api';
import { mapDriver, mapSubscription, mapVehicle } from './apiMappers';
import {
  getCachedDriverSessions,
  getCachedOwnerDrivers,
  getCachedSubscription,
  getCachedTripHistory,
  getCachedVehicles,
  resolveCurrentProfiles,
  setProfileCache,
} from './profileCache';
import { markFullProfileHydrated } from './profileHydration';
import * as mock from './mockStore';

let profilesRefreshInFlight: Promise<{ ok: boolean; error?: string }> | null = null;
let ownerFleetRefreshInFlight: Promise<{ ok: boolean; error?: string }> | null = null;

export {
  formatDate,
  formatDuration,
  formatTime,
} from './mockStore';

export function getDriverById(driverId: string): DriverProfileRecord | undefined {
  if (useMockApi()) {
    return mock.getStore().drivers.find((d) => d.id === driverId);
  }
  const cached = getCachedOwnerDrivers().find((d) => d.id === driverId);
  if (cached) return cached;
  const { driver } = resolveCurrentProfiles();
  return driver?.id === driverId ? driver : undefined;
}

export function getOwnerByUserId(userId: string): Owner | undefined {
  if (useMockApi()) return mock.getOwnerByUserId(userId);
  const { owner, user } = resolveCurrentProfiles();
  if (!owner) return undefined;
  if (owner.userId === userId) return owner;
  if (
    user?.userId === userId &&
    user.role === 'owner' &&
    (!owner.userId || owner.userId.trim() === '')
  ) {
    return { ...owner, userId };
  }
  return undefined;
}

export function getOwnerById(ownerId: string): Owner | undefined {
  if (useMockApi()) {
    return mock.getStore().owners.find((o) => o.id === ownerId);
  }
  const { owner } = resolveCurrentProfiles();
  return owner?.id === ownerId ? owner : undefined;
}

export function getDriverByUserId(userId: string): DriverProfileRecord | undefined {
  if (useMockApi()) return mock.getDriverByUserId(userId);
  const { driver } = resolveCurrentProfiles();
  return driver?.userId === userId ? driver : undefined;
}

export function getBusinessByUserId(userId: string): BusinessProfile | undefined {
  if (useMockApi()) return mock.getBusinessByUserId(userId);
  const { business } = resolveCurrentProfiles();
  return business?.userId === userId ? business : undefined;
}

export function getDriverSubscription(driverId: string): DriverSubscription | undefined {
  if (useMockApi()) return mock.getDriverSubscription(driverId);
  const sub = getCachedSubscription();
  return sub?.driverId === driverId ? sub : undefined;
}

export function getVehicle(vehicleId: string): Vehicle | undefined {
  if (useMockApi()) return mock.getVehicle(vehicleId);
  const fromDriver = resolveCurrentProfiles().driver;
  if (fromDriver?.vehicleId === vehicleId) {
    const cached = getCachedVehicles().find((v) => v.vehicleId === vehicleId);
    if (cached) return cached;
  }
  return getCachedVehicles().find((v) => v.vehicleId === vehicleId);
}

export function getOwnerVehicles(ownerId: string): Vehicle[] {
  if (useMockApi()) {
    return mock.getStore().vehicles.filter((v) => v.ownerId === ownerId);
  }
  return getCachedVehicles().filter((v) => v.ownerId === ownerId);
}

export function getOwnerDrivers(ownerId: string): DriverProfileRecord[] {
  if (useMockApi()) {
    return mock.getStore().drivers.filter((d) => d.ownerId === ownerId);
  }
  return getCachedOwnerDrivers().filter((d) => d.ownerId === ownerId);
}

export function getOwnerSessions(ownerId: string): DriverSession[] {
  if (useMockApi()) {
    const vehicleIds = mock
      .getStore()
      .vehicles.filter((v) => v.ownerId === ownerId)
      .map((v) => v.vehicleId);
    return mock.getStore().sessions.filter((s) => vehicleIds.includes(s.vehicleId));
  }
  const vehicleIds = getCachedVehicles()
    .filter((v) => v.ownerId === ownerId)
    .map((v) => v.vehicleId);
  return getCachedDriverSessions().filter((s) => vehicleIds.includes(s.vehicleId));
}

export function getActiveSession(driverId: string): DriverSession | undefined {
  if (useMockApi()) return mock.getActiveSession(driverId);
  return getCachedDriverSessions().find((s) => s.driverId === driverId && !s.disconnectedAt);
}

export function getAllSessionsByDriver(driverId: string): DriverSession[] {
  if (useMockApi()) return mock.getAllSessionsByDriver(driverId);
  return getCachedDriverSessions()
    .filter((s) => s.driverId === driverId)
    .sort((a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime());
}

export function getTripHistory(filters?: {
  passengerId?: string;
  driverId?: string;
  ownerId?: string;
}): TripHistoryRecord[] {
  if (useMockApi()) return mock.getTripHistory(filters);
  let records = [...getCachedTripHistory()];
  if (filters?.passengerId) {
    records = records.filter((r) => r.passengerId === filters.passengerId);
  }
  if (filters?.driverId) {
    records = records.filter((r) => r.driverId === filters.driverId);
  }
  if (filters?.ownerId) {
    const driverIds = getOwnerDrivers(filters.ownerId).map((d) => d.id);
    records = records.filter((r) => driverIds.includes(r.driverId));
  }
  return records;
}

export function getDeliveryHistory(filters?: { businessId?: string; driverId?: string }) {
  if (useMockApi()) return mock.getDeliveryHistory(filters);
  return [];
}

export function getOwnerDashboardStats(ownerId: string) {
  if (useMockApi()) return mock.getOwnerDashboardStats(ownerId);
  const sessions = getOwnerSessions(ownerId);
  const trips = getTripHistory({ ownerId });
  return {
    income: sessions.reduce((a, s) => a + s.totalCashCollected, 0),
    trips: sessions.reduce((a, s) => a + s.totalTrips, 0) || trips.length,
    kilometers: sessions.reduce((a, s) => a + s.totalKm, 0),
    deliveries: trips.filter((t) => t.status.includes('delivery')).length,
    activeHours: sessions.reduce((a, s) => a + (s.durationMinutes ?? 0), 0) / 60,
  };
}

export function getDriverDashboardStats(driverId: string) {
  if (useMockApi()) return mock.getDriverDashboardStats(driverId);
  const sessions = getAllSessionsByDriver(driverId);
  const income = sessions.reduce((a, s) => a + s.totalCashCollected, 0);
  const trips = sessions.reduce((a, s) => a + s.totalTrips, 0);
  return {
    earningsWeek: income,
    earningsMonth: income,
    tripsMonth: trips,
    deliveriesMonth: 0,
    trips,
    kilometers: sessions.reduce((a, s) => a + s.totalKm, 0),
    income,
  };
}

export function getBusinessDashboardStats(businessId: string) {
  if (useMockApi()) return mock.getBusinessDashboardStats(businessId);
  const history = getDeliveryHistory({ businessId });
  return {
    orders: history.length,
    deliveries: history.length,
    invoices: 0,
    costs: history.reduce((a, h) => a + h.price, 0),
  };
}

async function runRefreshProfilesFromApi(): Promise<{ ok: boolean; error?: string }> {
  const profiles = await api.fetchUserProfiles();
  const currentUser = profiles.user;
  if (!currentUser) return { ok: false, error: 'No se pudieron cargar los perfiles.' };

  let owner = profiles.owner;

  if (!owner && currentUser.role === 'owner') {
    const cachedOwner = resolveCurrentProfiles().owner;
    if (cachedOwner?.id) {
      const cachedUserId = cachedOwner.userId?.trim();
      if (!cachedUserId || cachedUserId === currentUser.userId) {
        owner = { ...cachedOwner, userId: cachedUserId || currentUser.userId };
      }
    }
    // TODO: no dedicated GET /owners/me profile endpoint exists; owner must come from /users/me/profiles.
  } else if (owner) {
    const cachedOwner = resolveCurrentProfiles().owner;
    if (cachedOwner?.id === owner.id) {
      owner = {
        ...cachedOwner,
        ...owner,
        name: owner.name?.trim() ? owner.name : cachedOwner.name,
        email: owner.email?.trim() ? owner.email : cachedOwner.email,
        documents: {
          ...(cachedOwner.documents ?? {}),
          ...(owner.documents ?? {}),
        },
      };
    }
  }

  const driverRaw = profiles.driver as (DriverProfileRecord & {
    subscription?: Record<string, unknown>;
    vehicle?: Record<string, unknown>;
  }) | null;
  const driver = driverRaw ? mapDriver(driverRaw as unknown as Record<string, unknown>) : null;
  const subscription = driverRaw?.subscription
    ? mapSubscription(driverRaw.subscription)
    : driver
      ? getCachedSubscription()
      : null;

  let vehicles = getCachedVehicles();
  if (owner) {
    const res = await api.fetchOwnerVehicles();
    if (res.ok && res.data) {
      vehicles = res.data;
    }
  }

  if (driver) {
    const vehicleFromProfile = driverRaw?.vehicle;
    if (vehicleFromProfile) {
      const mapped = mapVehicle(vehicleFromProfile);
      if (!vehicles.some((v) => v.vehicleId === mapped.vehicleId)) {
        vehicles = [...vehicles, mapped];
      }
    }
    if (subscription) setProfileCache({ subscription });
    const sessionsRes = await api.fetchDriverSessionsAsync(driver.id);
    setProfileCache({ driverSessions: sessionsRes });
  }

  const history = await api.fetchTripHistoryAsync();
  const business = 'business' in profiles ? profiles.business : null;

  setProfileCache({
    user: currentUser,
    owner,
    driver,
    business,
    vehicles,
    tripHistory: history,
  });

  markFullProfileHydrated(currentUser.userId);
  return { ok: true };
}

export async function refreshProfilesFromApi(): Promise<{ ok: boolean; error?: string }> {
  if (useMockApi()) return { ok: true };
  if (profilesRefreshInFlight) return profilesRefreshInFlight;

  profilesRefreshInFlight = runRefreshProfilesFromApi().finally(() => {
    profilesRefreshInFlight = null;
  });

  return profilesRefreshInFlight;
}

export async function refreshOwnerFleet(): Promise<{ ok: boolean; error?: string }> {
  if (useMockApi()) return { ok: true };
  if (ownerFleetRefreshInFlight) return ownerFleetRefreshInFlight;

  ownerFleetRefreshInFlight = (async () => {
    const res = await api.fetchOwnerVehicles();
    if (!res.ok) return { ok: false, error: res.error ?? 'Error al cargar vehículos' };
    if (res.data) setProfileCache({ vehicles: res.data });
    return { ok: true };
  })().finally(() => {
    ownerFleetRefreshInFlight = null;
  });

  return ownerFleetRefreshInFlight;
}

export async function refreshDriverSessions(driverId: string): Promise<DriverSession[]> {
  if (useMockApi()) return mock.getAllSessionsByDriver(driverId);
  const sessions = await api.fetchDriverSessionsAsync(driverId);
  setProfileCache({ driverSessions: sessions });
  return sessions;
}

export async function refreshSubscription(driverId: string): Promise<DriverSubscription | null> {
  if (useMockApi()) return mock.getDriverSubscription(driverId) ?? null;
  const sub = await api.fetchDriverSubscription();
  if (sub) setProfileCache({ subscription: sub });
  return sub;
}

export function upsertDriverSubscription(sub: DriverSubscription): void {
  if (useMockApi()) {
    mock.upsertDriverSubscription(sub);
    return;
  }
  setProfileCache({ subscription: sub });
}
