import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser, UserRole } from '../types/models';
import type { MockStoreData } from '../services/mockStore';
import { normalizeDui, normalizePhone, duiMatches } from '../utils/platform';

export const DEMO_MANIFEST_KEY = 'movi_demo_manifest';

/** Semilla fija para que las credenciales demo coincidan con el store de autenticación. */
export const DEMO_SEED = 42;

export type DemoAccountEntry = {
  phone: string;
  dui: string;
  name: string;
  userId: string;
};

export type DemoManifest = {
  seed: number;
  generatedAt: string;
  admin: DemoAccountEntry;
  passengers: DemoAccountEntry[];
  drivers: DemoAccountEntry[];
  owner: DemoAccountEntry;
  businesses: DemoAccountEntry[];
  inviteCodeOpen: string;
  inviteCodeUsed: string;
  openVehicleUnitNumber: string;
};

export type DemoAccountLoginStatus = DemoAccountEntry & {
  role: UserRole | 'passenger';
  roleLabel: string;
  status: 'ok' | 'not_in_store';
};

export function toDemoAccountEntry(user: AuthUser): DemoAccountEntry {
  return {
    userId: user.userId,
    phone: user.phoneNumber,
    dui: user.duiNumber,
    name: user.fullName,
  };
}

/** Construye el manifest desde el store activo (fuente de verdad para login). */
export function buildDemoManifestFromStore(store: MockStoreData): DemoManifest | null {
  const admin = store.users.find((u) => u.role === 'admin');
  const owner = store.users.find((u) => u.role === 'owner');
  if (!admin || !owner) return null;

  const openVehicle = store.vehicles.find((v) => v.status === 'approved' && !v.driverId);
  const inviteCodeOpen = store.inviteCodes.find((c) => !c.usedBy)?.code ?? 'MOVI-OPEN';
  const inviteCodeUsed = store.inviteCodes.find((c) => c.usedBy)?.code ?? 'MOVI-USED';

  return {
    seed: store.simulationMeta?.seed ?? DEMO_SEED,
    generatedAt: store.simulationMeta?.generatedAt ?? new Date().toISOString(),
    admin: toDemoAccountEntry(admin),
    passengers: store.users.filter((u) => u.role === 'passenger').slice(0, 5).map(toDemoAccountEntry),
    drivers: store.users.filter((u) => u.role === 'driver').slice(0, 3).map(toDemoAccountEntry),
    owner: toDemoAccountEntry(owner),
    businesses: store.users.filter((u) => u.role === 'business').slice(0, 3).map(toDemoAccountEntry),
    inviteCodeOpen,
    inviteCodeUsed,
    openVehicleUnitNumber: openVehicle?.unitNumber ?? '028',
  };
}

export function listDemoLoginAccounts(store: MockStoreData): DemoAccountLoginStatus[] {
  const manifest = buildDemoManifestFromStore(store);
  if (!manifest) return [];

  const rows: { role: UserRole; roleLabel: string; entry: DemoAccountEntry }[] = [
    { role: 'admin', roleLabel: 'Admin', entry: manifest.admin },
    ...manifest.passengers.map((entry, i) => ({
      role: 'passenger' as const,
      roleLabel: `Pasajero ${i + 1}`,
      entry,
    })),
    { role: 'owner', roleLabel: 'Dueño', entry: manifest.owner },
    ...manifest.drivers.map((entry, i) => ({
      role: 'driver' as const,
      roleLabel: `Conductor ${i + 1}`,
      entry,
    })),
    ...manifest.businesses.map((entry, i) => ({
      role: 'business' as const,
      roleLabel: `Negocio ${i + 1}`,
      entry,
    })),
  ];

  return rows.map(({ role, roleLabel, entry }) => {
    const normalizedPhone = normalizePhone(entry.phone);
    const match = store.users.find(
      (u) => u.phoneNumber === normalizedPhone && duiMatches(u.duiNumber, entry.dui)
    );
    return {
      ...entry,
      role,
      roleLabel,
      status: match ? 'ok' : 'not_in_store',
    };
  });
}

export async function saveDemoManifest(manifest: DemoManifest): Promise<void> {
  await AsyncStorage.setItem(DEMO_MANIFEST_KEY, JSON.stringify(manifest));
}

export async function clearDemoManifest(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_MANIFEST_KEY);
}

export async function loadDemoManifest(): Promise<DemoManifest | null> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_MANIFEST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoManifest;
  } catch {
    return null;
  }
}

/** Sincroniza AsyncStorage manifest con el store de autenticación. */
export async function syncDemoManifestFromStore(store: MockStoreData): Promise<DemoManifest | null> {
  const manifest = buildDemoManifestFromStore(store);
  if (manifest) {
    await saveDemoManifest(manifest);
  } else {
    await clearDemoManifest();
  }
  return manifest;
}
