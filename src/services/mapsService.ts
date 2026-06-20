import { Coordinates } from '../types';
import { getApiUrl, useMockApi } from './api/config';

export type BackendGeocodeResult = {
  name: string;
  coordinates: Coordinates;
  source: string;
};

export type TripRouteInfo = {
  distanceKm: number;
  durationMinutes: number;
  etaMinutes?: number;
  path?: Coordinates[];
  provider?: string;
};

async function mapsRequest<T>(
  path: string,
  options?: { method?: 'GET' | 'POST'; body?: unknown }
): Promise<T | null> {
  if (useMockApi()) return null;

  try {
    const base = getApiUrl().replace(/\/$/, '');
    const res = await fetch(`${base}${path}`, {
      method: options?.method ?? 'GET',
      headers: options?.body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

export async function geocodeViaBackend(query: string): Promise<BackendGeocodeResult[]> {
  const encoded = encodeURIComponent(query.trim());
  const data = await mapsRequest<{ results?: BackendGeocodeResult[] }>(
    `/locations/geocode?q=${encoded}`
  );
  return data?.results ?? [];
}

export async function reverseGeocodeViaBackend(coords: Coordinates): Promise<string | null> {
  const data = await mapsRequest<{ name?: string | null }>(
    `/locations/reverse?lat=${coords.latitude}&lng=${coords.longitude}`
  );
  return data?.name ?? null;
}

export async function fetchRouteViaBackend(
  origin: Coordinates,
  destination: Coordinates
): Promise<TripRouteInfo | null> {
  const data = await mapsRequest<TripRouteInfo>('/locations/route', {
    method: 'POST',
    body: { origin, destination },
  });
  if (!data || typeof data.distanceKm !== 'number') return null;
  return {
    distanceKm: data.distanceKm,
    durationMinutes: data.durationMinutes,
    etaMinutes: data.durationMinutes,
    path: data.path,
    provider: data.provider,
  };
}

export async function fetchDistanceViaBackend(
  origin: Coordinates,
  destination: Coordinates
): Promise<TripRouteInfo | null> {
  const data = await mapsRequest<TripRouteInfo>('/locations/distance', {
    method: 'POST',
    body: { origin, destination },
  });
  if (!data || typeof data.distanceKm !== 'number') return null;
  return {
    distanceKm: data.distanceKm,
    durationMinutes: data.etaMinutes ?? data.durationMinutes ?? 0,
    etaMinutes: data.etaMinutes ?? data.durationMinutes,
    path: data.path,
    provider: data.provider,
  };
}
