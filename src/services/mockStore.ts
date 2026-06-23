import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthUser,
  BusinessProfile,
  DeliveryHistoryRecord,
  DemandZone,
  DriverProfileRecord,
  DriverSession,
  DriverSubscription,
  InviteCode,
  Owner,
  TripHistoryRecord,
  Vehicle,
  UserRole,
} from '../types/models';
import type {
  DemoRoleStats,
  DemoSimulationMeta,
  PassengerProfileExtra,
} from '../types/demoSimulation';
import { normalizeDui, normalizePhone, duiMatches } from '../utils/platform';
import { buildProductionDemoStore } from './demoSimulation';
import { syncDemoManifestFromStore, DEMO_SEED, buildDemoManifestFromStore } from '../data/demoCredentials';

export { buildProductionDemoStore as generateDemoEnvironment } from './demoSimulation';

const STORE_KEY = 'movi_mock_store_v7';

export interface MockStoreData {
  users: AuthUser[];
  owners: Owner[];
  vehicles: Vehicle[];
  drivers: DriverProfileRecord[];
  businesses: BusinessProfile[];
  subscriptions: DriverSubscription[];
  sessions: DriverSession[];
  inviteCodes: InviteCode[];
  tripHistory: TripHistoryRecord[];
  deliveryHistory: DeliveryHistoryRecord[];
  demandZones: DemandZone[];
  currentUserId: string | null;
  otpPhone: string | null;
  passwords?: Record<string, string>;
  simulationMeta?: DemoSimulationMeta;
  passengerProfiles?: PassengerProfileExtra[];
  roleStats?: DemoRoleStats;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createUser(
  phoneNumber: string,
  fullName: string,
  duiNumber: string,
  role: UserRole
): AuthUser {
  const ts = nowIso();
  return {
    userId: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName,
    phoneNumber: normalizePhone(phoneNumber),
    duiNumber: normalizeDui(duiNumber),
    role,
    phoneVerified: true,
    createdAt: ts,
    updatedAt: ts,
  };
}

function emptyStore(): MockStoreData {
  return {
    users: [],
    owners: [],
    vehicles: [],
    drivers: [],
    businesses: [],
    subscriptions: [],
    sessions: [],
    inviteCodes: [],
    tripHistory: [],
    deliveryHistory: [],
    demandZones: [],
    currentUserId: null,
    otpPhone: null,
  };
}

function seedStore(): MockStoreData {
  return emptyStore();
}

function migrateUser(raw: Record<string, unknown>): AuthUser {
  if (raw.userId && typeof raw.userId === 'string') {
    return raw as unknown as AuthUser;
  }
  const ts = (raw.createdAt as string) ?? nowIso();
  return {
    userId: (raw.id as string) ?? `user-${Date.now()}`,
    fullName: (raw.name as string) ?? '',
    phoneNumber: normalizePhone((raw.phone as string) ?? (raw.phoneNumber as string) ?? ''),
    duiNumber: normalizeDui((raw.duiNumber as string) ?? ''),
    role: (raw.role as UserRole) ?? 'passenger',
    phoneVerified: (raw.phoneVerified as boolean) ?? true,
    createdAt: ts,
    updatedAt: (raw.updatedAt as string) ?? ts,
  };
}

function migrateVehicle(raw: Record<string, unknown>): Vehicle {
  const v = raw as unknown as Vehicle;
  if (v.unitId) return v;
  return {
    ...v,
    unitId: v.unitId ?? `MOVI-UNIT-${String(1).padStart(6, '0')}`,
    registrationName: v.registrationName,
  };
}

function migrateStore(parsed: Partial<MockStoreData>): MockStoreData {
  const base = emptyStore();
  return {
    ...base,
    ...parsed,
    users: (parsed.users ?? []).map((u) => migrateUser(u as unknown as Record<string, unknown>)),
    vehicles: (parsed.vehicles ?? []).map((v) =>
      migrateVehicle(v as unknown as Record<string, unknown>)
    ),
    tripHistory: parsed.tripHistory ?? [],
    deliveryHistory: parsed.deliveryHistory ?? [],
    businesses: parsed.businesses ?? [],
    subscriptions: parsed.subscriptions ?? [],
    demandZones: parsed.demandZones ?? [],
    simulationMeta: parsed.simulationMeta,
    passengerProfiles: parsed.passengerProfiles ?? [],
    roleStats: parsed.roleStats,
    currentUserId: parsed.currentUserId
      ? migrateUserId(parsed.currentUserId, parsed.users ?? [])
      : null,
  };
}

function migrateUserId(id: string, users: unknown[]): string {
  const match = users.find((u) => {
    const r = u as Record<string, unknown>;
    return r.userId === id || r.id === id;
  }) as Record<string, unknown> | undefined;
  if (!match) return id;
  return (match.userId as string) ?? (match.id as string) ?? id;
}

let memoryStore: MockStoreData = seedStore();
let storeLoadPromise: Promise<MockStoreData> | null = null;

async function loadStoreInternal(): Promise<MockStoreData> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) {
      memoryStore = migrateStore(JSON.parse(raw));
      if (memoryStore.users.length === 0) {
        await ensureDemoData();
      }
    } else {
      await ensureDemoData();
    }
  } catch {
    await ensureDemoData();
  }

  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    memoryStore.simulationMeta &&
    memoryStore.simulationMeta.seed !== DEMO_SEED
  ) {
    memoryStore = await buildProductionDemoStore();
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(memoryStore));
  }

  await syncDemoManifestFromStore(memoryStore);
  return memoryStore;
}

async function ensureDemoData(): Promise<MockStoreData> {
  if (memoryStore.users.length === 0) {
    memoryStore = await buildProductionDemoStore();
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(memoryStore));
    await syncDemoManifestFromStore(memoryStore);
  }
  return memoryStore;
}

export async function loadStore(): Promise<MockStoreData> {
  if (!storeLoadPromise) {
    storeLoadPromise = loadStoreInternal();
  }
  return storeLoadPromise;
}

/** Garantiza que el mock store esté cargado antes de login/OTP. */
export async function ensureStoreReady(): Promise<MockStoreData> {
  return loadStore();
}

export async function reloadStore(): Promise<MockStoreData> {
  storeLoadPromise = loadStoreInternal();
  return storeLoadPromise;
}

export async function saveStore(data: MockStoreData): Promise<void> {
  memoryStore = data;
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(data));
}

/** Reinicia el store al estado demo inicial (útil para QA). */
export async function resetStoreToSeed(): Promise<MockStoreData> {
  memoryStore = await buildProductionDemoStore();
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(memoryStore));
  await syncDemoManifestFromStore(memoryStore);
  storeLoadPromise = Promise.resolve(memoryStore);
  return memoryStore;
}

export function getStore(): MockStoreData {
  return memoryStore;
}

export function updateStore(updater: (store: MockStoreData) => MockStoreData): MockStoreData {
  memoryStore = updater(memoryStore);
  void saveStore(memoryStore);
  return memoryStore;
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MOVI-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function findUserByPhone(phone: string): AuthUser | undefined {
  const normalized = normalizePhone(phone);
  return memoryStore.users.find((u) => u.phoneNumber === normalized);
}

export function findUserByPhoneAndDui(phone: string, dui: string): AuthUser | undefined {
  const normalizedPhone = normalizePhone(phone);
  return memoryStore.users.find(
    (u) => u.phoneNumber === normalizedPhone && duiMatches(u.duiNumber, dui)
  );
}

export function getCurrentUser(): AuthUser | null {
  if (!memoryStore.currentUserId) return null;
  return memoryStore.users.find((u) => u.userId === memoryStore.currentUserId) ?? null;
}

export function setCurrentUser(userId: string | null): void {
  memoryStore.currentUserId = userId;
  void saveStore(memoryStore);
}

export function getOwnerByUserId(userId: string): Owner | undefined {
  return memoryStore.owners.find((o) => o.userId === userId);
}

export function getDriverByUserId(userId: string): DriverProfileRecord | undefined {
  return memoryStore.drivers.find((d) => d.userId === userId);
}

export function getBusinessByUserId(userId: string): BusinessProfile | undefined {
  return memoryStore.businesses.find((b) => b.userId === userId);
}

export function getDriverSubscription(driverId: string): DriverSubscription | undefined {
  return memoryStore.subscriptions.find((s) => s.driverId === driverId);
}

export function upsertDriverSubscription(sub: DriverSubscription): void {
  updateStore((s) => {
    const rest = s.subscriptions.filter((x) => x.driverId !== sub.driverId);
    return { ...s, subscriptions: [...rest, sub] };
  });
}

export function getDeliveryHistory(filters?: { businessId?: string; driverId?: string }) {
  let records = [...memoryStore.deliveryHistory].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  if (filters?.businessId) records = records.filter((r) => r.businessId === filters.businessId);
  if (filters?.driverId) records = records.filter((r) => r.driverId === filters.driverId);
  return records;
}

export function addDeliveryHistory(record: Omit<DeliveryHistoryRecord, 'id'>): DeliveryHistoryRecord {
  const item: DeliveryHistoryRecord = { ...record, id: generateId('dhist') };
  updateStore((s) => ({ ...s, deliveryHistory: [item, ...s.deliveryHistory] }));
  return item;
}

export function getVehicle(vehicleId: string): Vehicle | undefined {
  return memoryStore.vehicles.find((v) => v.vehicleId === vehicleId);
}

export function getVehicleByUnitId(unitId: string): Vehicle | undefined {
  return memoryStore.vehicles.find((v) => v.unitId === unitId);
}

export function getSessionsByDriver(driverId: string): DriverSession[] {
  return memoryStore.sessions.filter((s) => s.driverId === driverId);
}

export function getAllSessionsByDriver(driverId: string): DriverSession[] {
  return getSessionsByDriver(driverId).sort(
    (a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
  );
}

export function getActiveSession(driverId: string): DriverSession | undefined {
  return memoryStore.sessions.find((s) => s.driverId === driverId && !s.disconnectedAt);
}

export function getTripHistory(filters?: {
  passengerId?: string;
  driverId?: string;
  ownerId?: string;
}): TripHistoryRecord[] {
  let records = [...memoryStore.tripHistory].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  if (filters?.passengerId) {
    records = records.filter((r) => r.passengerId === filters.passengerId);
  }
  if (filters?.driverId) {
    records = records.filter((r) => r.driverId === filters.driverId);
  }
  if (filters?.ownerId) {
    const vehicleIds = memoryStore.vehicles
      .filter((v) => v.ownerId === filters.ownerId)
      .map((v) => v.vehicleId);
    const driverIds = memoryStore.drivers
      .filter((d) => vehicleIds.includes(d.vehicleId))
      .map((d) => d.id);
    records = records.filter((r) => driverIds.includes(r.driverId));
  }
  return records;
}

export function addTripHistory(record: Omit<TripHistoryRecord, 'id'>): TripHistoryRecord {
  const item: TripHistoryRecord = { ...record, id: generateId('hist') };
  updateStore((s) => ({ ...s, tripHistory: [item, ...s.tripHistory] }));
  return item;
}

export function getDemandZones(): DemandZone[] {
  return memoryStore.demandZones;
}

export function getSimulationMeta(): DemoSimulationMeta | undefined {
  return memoryStore.simulationMeta;
}

export function getPassengerProfile(userId: string): PassengerProfileExtra | undefined {
  return memoryStore.passengerProfiles?.find((p) => p.userId === userId);
}

export function getDriverDashboardStats(driverId: string) {
  return memoryStore.roleStats?.drivers[driverId];
}

export function getOwnerDashboardStats(ownerId: string) {
  return memoryStore.roleStats?.owners[ownerId];
}

export function getBusinessDashboardStats(businessId: string) {
  return memoryStore.roleStats?.businesses[businessId];
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'En curso';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-SV', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export { createUser };
