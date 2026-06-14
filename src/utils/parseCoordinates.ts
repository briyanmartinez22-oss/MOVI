import { ParsedCoordinates } from '../types/models';

const COORD_PAIR =
  /(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/;

const URL_PATTERNS = [
  /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/i,
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  /ll=(-?\d+\.\d+),(-?\d+\.\d+)/i,
  /(-?\d+\.\d+),(-?\d+\.\d+)/,
];

function isValidLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function isElSalvadorRegion(lat: number, lng: number): boolean {
  return lat >= 12.8 && lat <= 14.8 && lng >= -90.5 && lng <= -87.2;
}

function buildResult(
  lat: number,
  lng: number,
  source: ParsedCoordinates['source']
): ParsedCoordinates | null {
  if (!isValidLatLng(lat, lng)) {
    return null;
  }
  return {
    latitude: lat,
    longitude: lng,
    source,
    label: isElSalvadorRegion(lat, lng) ? 'El Salvador' : 'Ubicación',
  };
}

export function parseCoordinates(input: string): ParsedCoordinates | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const rawMatch = trimmed.match(COORD_PAIR);
  if (rawMatch) {
    return buildResult(parseFloat(rawMatch[1]), parseFloat(rawMatch[2]), 'raw');
  }

  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const result = buildResult(parseFloat(match[1]), parseFloat(match[2]), 'url');
      if (result) {
        return result;
      }
    }
  }

  if (/whatsapp|wa\.me|maps\.google|google\.com\/maps|waze\.com/i.test(trimmed)) {
    for (const pattern of URL_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        const result = buildResult(parseFloat(match[1]), parseFloat(match[2]), 'whatsapp');
        if (result) {
          return result;
        }
      }
    }
  }

  return null;
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
