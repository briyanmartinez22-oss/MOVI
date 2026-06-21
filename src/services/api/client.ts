import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../../types/models';
import { SESSION_KEYS } from '../authService';
import { getApiUrl } from './config';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean;
  body?: unknown;
}

function buildUrl(path: string): string {
  const base = getApiUrl().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

const FETCH_TIMEOUT_MS = 12_000;

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { auth = true, body, headers, ...rest } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
      return {
        ok: false,
        error: payload?.error ?? `Error del servidor (${response.status})`,
      };
    }

    if (payload && typeof payload.ok === 'boolean') {
      return payload;
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        error: `Sin conexión (${getApiUrl()}). Verifica tu red o que el backend esté activo.`,
      };
    }
    const message =
      error instanceof TypeError
        ? `Sin conexión (${getApiUrl()}). Verifica tu red o que el backend esté activo.`
        : error instanceof Error
          ? error.message
          : 'Error de red';
    return { ok: false, error: message };
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
