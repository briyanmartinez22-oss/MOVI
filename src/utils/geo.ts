import { Coordinates } from '../types';

const EARTH_RADIUS_KM = 6371;
export const TUK_TUK_SPEED_KMH = 20;
export const MIN_ETA_MINUTES = 2;

export function calculateDistanceKm(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function calculateEtaMinutes(distanceKm: number): number {
  const rawMinutes = (distanceKm / TUK_TUK_SPEED_KMH) * 60;
  return Math.max(MIN_ETA_MINUTES, Math.round(rawMinutes));
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatEta(minutes: number): string {
  return `${minutes} min`;
}
