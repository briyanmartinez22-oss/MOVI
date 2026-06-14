import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole } from '../types/models';

export type DiagnosticEntry = {
  id: string;
  error: string;
  route: string;
  userId: string | null;
  role: UserRole | null;
  date: string;
  stack?: string;
};

const STORAGE_KEY = '@movi/diagnostics';
const MAX_ENTRIES = 100;

let entries: DiagnosticEntry[] = [];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeDiagnostics(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getDiagnostics(): DiagnosticEntry[] {
  return [...entries];
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore persistence errors in dev */
  }
}

export async function loadDiagnostics() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) entries = JSON.parse(raw) as DiagnosticEntry[];
  } catch {
    entries = [];
  }
  notify();
}

export function logDiagnostic(params: {
  error: unknown;
  route: string;
  userId?: string | null;
  role?: UserRole | null;
}) {
  const message =
    params.error instanceof Error
      ? params.error.message
      : typeof params.error === 'string'
        ? params.error
        : 'Error desconocido';

  const stack = params.error instanceof Error ? params.error.stack : undefined;

  const entry: DiagnosticEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    error: message,
    route: params.route,
    userId: params.userId ?? null,
    role: params.role ?? null,
    date: new Date().toISOString(),
    stack,
  };

  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  if (__DEV__) {
    console.warn('[MOVI Diagnostics]', entry);
  }
  void persist();
  notify();
}

export async function clearDiagnostics() {
  entries = [];
  await AsyncStorage.removeItem(STORAGE_KEY);
  notify();
}
