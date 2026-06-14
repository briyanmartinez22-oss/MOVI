import Constants from 'expo-constants';

/**
 * Expo public env vars — set in .env or app.json extra.
 * Remote testing (El Salvador): use HTTPS/WSS public backend URL in .env
 * Never use localhost or LAN IP for physical devices abroad.
 */
const DEFAULT_API_URL = '';

function readPublicEnv(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  return extra?.[key];
}

export function getApiUrl(): string {
  const url = readPublicEnv('EXPO_PUBLIC_API_URL') ?? DEFAULT_API_URL;
  if (!url && !useMockApi()) {
    console.warn(
      '[MOVI] EXPO_PUBLIC_API_URL no configurada. Copia .env.remote.example → .env con la URL pública del backend.'
    );
  }
  return url;
}

export function getWsUrl(): string {
  const explicit = readPublicEnv('EXPO_PUBLIC_WS_URL');
  if (explicit) return explicit;
  const api = getApiUrl();
  if (api.startsWith('https://')) {
    return `${api.replace(/^https/, 'wss')}/ws`;
  }
  return `${api.replace(/^http/, 'ws')}/ws`;
}

/** When true, all API calls use in-memory mock store (offline demo). */
export function useMockApi(): boolean {
  const explicit = readPublicEnv('EXPO_PUBLIC_USE_MOCK_API');
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return !readPublicEnv('EXPO_PUBLIC_API_URL');
}

export const env = {
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
  useMockApi: useMockApi(),
} as const;
