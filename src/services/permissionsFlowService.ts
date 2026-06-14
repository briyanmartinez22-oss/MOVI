import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingRegistrationFlow =
  | 'passenger_register'
  | 'owner_register'
  | 'driver_register'
  | 'business_register';

const STORAGE_KEY = 'movi_permissions_accepted_v1';

type AcceptedMap = Partial<Record<PendingRegistrationFlow, boolean>>;

async function readAccepted(): Promise<AcceptedMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AcceptedMap;
  } catch {
    return {};
  }
}

async function writeAccepted(map: AcceptedMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function hasPermissionsAccepted(flow: PendingRegistrationFlow): Promise<boolean> {
  const map = await readAccepted();
  return map[flow] === true;
}

export async function markPermissionsAccepted(flow: PendingRegistrationFlow): Promise<void> {
  const map = await readAccepted();
  map[flow] = true;
  await writeAccepted(map);
}

export async function clearPermissionsAccepted(flow?: PendingRegistrationFlow): Promise<void> {
  if (!flow) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  const map = await readAccepted();
  delete map[flow];
  await writeAccepted(map);
}

/** Params reservados de navegación — no reenviar a la siguiente pantalla. */
export const PERMISSIONS_NAV_KEYS = ['nextRoute', 'pendingFlow'] as const;

export function stripPermissionsNavParams(
  params: Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (PERMISSIONS_NAV_KEYS.includes(key as (typeof PERMISSIONS_NAV_KEYS)[number])) continue;
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}
