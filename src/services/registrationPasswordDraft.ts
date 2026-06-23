import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePhone } from '../utils/platform';

const STORAGE_KEY = 'movi_registration_password_draft';
const TTL_MS = 30 * 60 * 1000;

type Draft = {
  phone: string;
  password: string;
  createdAt: number;
};

/** Guarda contraseña de registro fuera de la URL (evita corrupción por &, #, etc.). */
export async function stashRegistrationPassword(phone: string, password: string): Promise<void> {
  const draft: Draft = {
    phone: normalizePhone(phone),
    password,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

/** Lee y elimina la contraseña pendiente si coincide con el teléfono. */
export async function consumeRegistrationPassword(phone: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  let draft: Draft;
  try {
    draft = JSON.parse(raw) as Draft;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }

  const expired = Date.now() - draft.createdAt > TTL_MS;
  const phoneMatch = draft.phone === normalizePhone(phone);
  await AsyncStorage.removeItem(STORAGE_KEY);

  if (expired || !phoneMatch || !draft.password?.trim()) return null;
  return draft.password;
}

export async function clearRegistrationPasswordDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
