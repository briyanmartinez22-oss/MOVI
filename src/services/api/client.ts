import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../../types/models';
import { SESSION_KEYS } from '../authService';
import { getApiUrl, useMockApi } from './config';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean;
  body?: unknown;
}

function resolveApiBaseUrl(): { ok: true; base: string } | { ok: false; error: string; code: string } {
  if (useMockApi()) {
    return { ok: true, base: 'mock://local' };
  }

  const base = getApiUrl().replace(/\/$/, '').trim();
  if (!base) {
    return {
      ok: false,
      error:
        'La app no tiene URL del backend configurada. Reinstala el APK actualizado o contacta soporte MOVI.',
      code: 'API_URL_MISSING',
    };
  }

  if (/^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) {
    return {
      ok: false,
      error:
        'La app apunta a localhost. Usa el APK de producción con Railway configurado.',
      code: 'API_URL_LOCALHOST',
    };
  }

  return { ok: true, base };
}

function buildUrl(path: string): string {
  const resolved = resolveApiBaseUrl();
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }
  if (resolved.base === 'mock://local') {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${resolved.base}${normalized}`;
}

const DEFAULT_TIMEOUT_MS = 12_000;
const AUTH_TIMEOUT_MS = 20_000;

function timeoutForPath(path: string): number {
  if (path.startsWith('/auth/')) return AUTH_TIMEOUT_MS;
  return DEFAULT_TIMEOUT_MS;
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true;
  return /network request failed|failed to fetch|network error/i.test(error.message);
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { auth = true, body, headers, ...rest } = options;

  const resolved = resolveApiBaseUrl();
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, code: resolved.code };
  }

  const controller = new AbortController();
  const timeoutMs = timeoutForPath(path);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    if (body !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (auth) {
      const token = await AsyncStorage.getItem(SESSION_KEYS.authToken);
      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(buildUrl(path), {
      ...rest,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let payload: ApiResponse<T> | null = null;
    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const serverError =
        payload?.error ??
        (response.status >= 500
          ? 'El servidor no está disponible temporalmente. Intenta en unos minutos.'
          : `Error del servidor (${response.status})`);
      return {
        ok: false,
        error: serverError,
        code: payload?.code,
      };
    }

    if (payload && typeof payload.ok === 'boolean') {
      return payload;
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    if (error instanceof Error && error.message.includes('backend configurada')) {
      return { ok: false, error: error.message, code: 'API_URL_MISSING' };
    }
    if (error instanceof Error && error.message.includes('localhost')) {
      return { ok: false, error: error.message, code: 'API_URL_LOCALHOST' };
    }
    if (isNetworkFailure(error)) {
      const base = resolved.ok ? resolved.base : getApiUrl();
      const detail =
        error instanceof Error && error.name === 'AbortError'
          ? 'La solicitud tardó demasiado.'
          : 'No se pudo conectar al servidor.';
      return {
        ok: false,
        error: `${detail} Verifica tu red. Backend: ${base || '(no configurado)'}`,
        code: 'NETWORK_ERROR',
      };
    }
    const message = error instanceof Error ? error.message : 'Error de red';
    return { ok: false, error: message, code: 'NETWORK_ERROR' };
  } finally {
    clearTimeout(timeout);
  }
}

export function apiGet<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
  return apiFetch<T>(path, { ...options, method: 'GET' });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
) {
  return apiFetch<T>(path, { ...options, method: 'POST', body });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
) {
  return apiFetch<T>(path, { ...options, method: 'PATCH', body });
}

export function apiDelete<T>(
  path: string,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
) {
  return apiFetch<T>(path, { ...options, method: 'DELETE' });
}

export function getConfiguredApiUrl(): string {
  return getApiUrl();
}

export function isApiConfiguredForRemote(): boolean {
  const resolved = resolveApiBaseUrl();
  return resolved.ok && resolved.base !== 'mock://local';
}
