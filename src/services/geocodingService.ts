import { Coordinates } from '../types';
import { parseCoordinates } from '../utils/parseCoordinates';
import { salvadorPlaces } from '../data/mock';

export interface GeocodeResult {
  name: string;
  coordinates: Coordinates;
  source: 'coordinates' | 'place' | 'address' | 'reverse';
}

/**
 * Mock geocoding — preparado para Nominatim/backend real.
 *
 * Prioridad de resolución (misma que en producción):
 * 1. Coordenadas GPS (lat/lng, URLs de mapas, WhatsApp location) — máxima precisión.
 * 2. Lugares conocidos del catálogo local.
 * 3. Dirección de texto libre (geocodificación aproximada).
 */
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

export async function geocodeQuery(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // GPS / coordenadas primero — no degradar a búsqueda por nombre si el input ya es una ubicación exacta.
  const direct = geocodeCoordinateString(trimmed);
  if (direct) return [direct];

  // Catálogo de lugares (segunda prioridad, tras coordenadas).
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

  // Dirección libre — última prioridad; menor precisión que GPS o lugar catalogado.
  return [
    {
      name: trimmed,
      coordinates: { latitude: 13.6929 + Math.random() * 0.02, longitude: -89.2182 + Math.random() * 0.02 },
      source: 'address',
    },
  ];
}

export async function reverseGeocode(coords: Coordinates): Promise<string> {
  const match = salvadorPlaces.find(
    (p) =>
      Math.abs(p.coordinates.latitude - coords.latitude) < 0.01 &&
      Math.abs(p.coordinates.longitude - coords.longitude) < 0.01
  );
  if (match) return match.name;
  return `Ubicación (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`;
}
