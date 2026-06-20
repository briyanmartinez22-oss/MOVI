import { Coordinates } from '../types';
import { parseCoordinates } from '../utils/parseCoordinates';
import { salvadorPlaces } from '../data/mock';
import {
  fetchRouteViaBackend,
  geocodeViaBackend,
  reverseGeocodeViaBackend,
  type TripRouteInfo,
} from './mapsService';

export interface GeocodeResult {
  name: string;
  coordinates: Coordinates;
  source: 'coordinates' | 'place' | 'address' | 'reverse' | 'google' | 'mapbox' | 'fallback';
}

export type { TripRouteInfo };

/** Acepta coordenadas en formato `13.70225, -89.21160` (lat, lng con espacio opcional). */
export function geocodeCoordinateString(query: string): GeocodeResult | null {
  const parsed = parseCoordinates(query.trim());
  if (!parsed) return null;
  return {
    name: `Coordenadas (${parsed.latitude.toFixed(5)}, ${parsed.longitude.toFixed(5)})`,
    coordinates: { latitude: parsed.latitude, longitude: parsed.longitude },
    source: 'coordinates',
  };
}

function mapBackendSource(source: string): GeocodeResult['source'] {
  if (source === 'google' || source === 'mapbox' || source === 'fallback') return source;
  if (source === 'place' || source === 'coordinates' || source === 'address') return source;
  return 'address';
}

export async function geocodeQuery(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const direct = geocodeCoordinateString(trimmed);
  if (direct) return [direct];

  const backendResults = await geocodeViaBackend(trimmed);
  if (backendResults.length > 0) {
    return backendResults.map((result) => ({
      name: result.name,
      coordinates: result.coordinates,
      source: mapBackendSource(result.source),
    }));
  }

  const places = salvadorPlaces.filter((p) =>
    p.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  if (places.length > 0) {
    return places.map((p) => ({
      name: p.name,
      coordinates: p.coordinates,
      source: 'place' as const,
    }));
  }

  return [
    {
      name: trimmed,
      coordinates: {
        latitude: 13.6929 + Math.random() * 0.02,
        longitude: -89.2182 + Math.random() * 0.02,
      },
      source: 'address',
    },
  ];
}

export async function reverseGeocode(coords: Coordinates): Promise<string> {
  const backendName = await reverseGeocodeViaBackend(coords);
  if (backendName) return backendName;

  const match = salvadorPlaces.find(
    (p) =>
      Math.abs(p.coordinates.latitude - coords.latitude) < 0.01 &&
      Math.abs(p.coordinates.longitude - coords.longitude) < 0.01
  );
  if (match) return match.name;
  return `Ubicación (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`;
}

export async function fetchTripRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<TripRouteInfo | null> {
  return fetchRouteViaBackend(origin, destination);
}
