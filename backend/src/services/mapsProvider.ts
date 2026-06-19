import {
  env,
  getResolvedMapsMode,
  isGoogleMapsConfigured,
  isMapboxConfigured,
} from '../config/env';
import { getDemandZonesSeed } from './moviService';

export type Coordinates = { latitude: number; longitude: number };

export type GeocodeResult = {
  name: string;
  coordinates: Coordinates;
  source: 'coordinates' | 'place' | 'address' | 'google' | 'mapbox' | 'fallback';
};

export type RouteResult = {
  distanceKm: number;
  durationMinutes: number;
  polyline?: string;
  provider: 'fallback' | 'google' | 'mapbox';
};

export interface MapsProvider {
  mode: 'fallback' | 'google' | 'mapbox';
  geocode(query: string): Promise<GeocodeResult[]>;
  reverseGeocode(coords: Coordinates): Promise<string>;
  calculateDistanceKm(origin: Coordinates, destination: Coordinates): Promise<number>;
  calculateEtaMinutes(distanceKm: number): number;
  getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult>;
}

function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function parseCoordinateQuery(query: string): GeocodeResult | null {
  const trimmed = query.trim();
  const match = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    name: `Coordenadas (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
    coordinates: { latitude, longitude },
    source: 'coordinates',
  };
}

function createFallbackProvider(): MapsProvider {
  const places = getDemandZonesSeed().map((zone) => ({
    name: zone.label,
    coordinates: { latitude: zone.latitude, longitude: zone.longitude },
  }));

  return {
    mode: 'fallback',
    async geocode(query) {
      const direct = parseCoordinateQuery(query);
      if (direct) return [direct];

      const trimmed = query.trim().toLowerCase();
      const matches = places.filter((p) => p.name.toLowerCase().includes(trimmed));
      if (matches.length > 0) {
        return matches.map((p) => ({
          name: p.name,
          coordinates: p.coordinates,
          source: 'place' as const,
        }));
      }

      return [
        {
          name: query.trim(),
          coordinates: {
            latitude: 13.6929 + Math.random() * 0.02,
            longitude: -89.2182 + Math.random() * 0.02,
          },
          source: 'fallback',
        },
      ];
    },
    async reverseGeocode(coords) {
      const match = places.find(
        (p) =>
          Math.abs(p.coordinates.latitude - coords.latitude) < 0.01 &&
          Math.abs(p.coordinates.longitude - coords.longitude) < 0.01
      );
      if (match) return match.name;
      return `Ubicación (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`;
    },
    async calculateDistanceKm(origin, destination) {
      return haversineKm(origin, destination);
    },
    calculateEtaMinutes(distanceKm) {
      return Math.max(3, Math.round(distanceKm * 3));
    },
    async getRoute(origin, destination) {
      const distanceKm = haversineKm(origin, destination);
      return {
        distanceKm,
        durationMinutes: Math.max(3, Math.round(distanceKm * 3)),
        provider: 'fallback',
      };
    },
  };
}

async function createGoogleProvider(): Promise<MapsProvider> {
  const apiKey = env.googleMapsApiKey!;

  async function googleFetch(path: string, params: Record<string, string>) {
    const qs = new URLSearchParams({ ...params, key: apiKey });
    const res = await fetch(`https://maps.googleapis.com/maps/api/${path}?${qs}`);
    if (!res.ok) throw new Error(`Google Maps API error (${res.status})`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  return {
    mode: 'google',
    async geocode(query) {
      const direct = parseCoordinateQuery(query);
      if (direct) return [direct];

      const data = await googleFetch('geocode/json', { address: query });
      const results = (data.results as Array<Record<string, unknown>>) ?? [];
      return results.slice(0, 5).map((r) => {
        const loc = (r.geometry as { location: { lat: number; lng: number } }).location;
        return {
          name: (r.formatted_address as string) ?? query,
          coordinates: { latitude: loc.lat, longitude: loc.lng },
          source: 'google' as const,
        };
      });
    },
    async reverseGeocode(coords) {
      const data = await googleFetch('geocode/json', {
        latlng: `${coords.latitude},${coords.longitude}`,
      });
      const results = (data.results as Array<{ formatted_address?: string }>) ?? [];
      return results[0]?.formatted_address ?? `Ubicación (${coords.latitude}, ${coords.longitude})`;
    },
    async calculateDistanceKm(origin, destination) {
      return haversineKm(origin, destination);
    },
    calculateEtaMinutes(distanceKm) {
      return Math.max(3, Math.round(distanceKm * 3));
    },
    async getRoute(origin, destination) {
      const data = await googleFetch('directions/json', {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
      });
      const routes = (data.routes as Array<Record<string, unknown>>) ?? [];
      const leg = (routes[0]?.legs as Array<Record<string, unknown>>)?.[0];
      const distanceM = (leg?.distance as { value?: number })?.value ?? 0;
      const durationS = (leg?.duration as { value?: number })?.value ?? 0;
      return {
        distanceKm: distanceM / 1000,
        durationMinutes: Math.max(1, Math.round(durationS / 60)),
        polyline: (routes[0]?.overview_polyline as { points?: string })?.points,
        provider: 'google',
      };
    },
  };
}

async function createMapboxProvider(): Promise<MapsProvider> {
  const token = env.mapboxAccessToken!;

  return {
    mode: 'mapbox',
    async geocode(query) {
      const direct = parseCoordinateQuery(query);
      if (direct) return [direct];

      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=5`
      );
      if (!res.ok) throw new Error(`Mapbox geocoding error (${res.status})`);
      const data = (await res.json()) as {
        features: Array<{ place_name: string; center: [number, number] }>;
      };
      return data.features.map((f) => ({
        name: f.place_name,
        coordinates: { latitude: f.center[1], longitude: f.center[0] },
        source: 'mapbox' as const,
      }));
    },
    async reverseGeocode(coords) {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.longitude},${coords.latitude}.json?access_token=${token}&limit=1`
      );
      if (!res.ok) throw new Error(`Mapbox reverse geocoding error (${res.status})`);
      const data = (await res.json()) as { features: Array<{ place_name: string }> };
      return data.features[0]?.place_name ?? `Ubicación (${coords.latitude}, ${coords.longitude})`;
    },
    async calculateDistanceKm(origin, destination) {
      return haversineKm(origin, destination);
    },
    calculateEtaMinutes(distanceKm) {
      return Math.max(3, Math.round(distanceKm * 3));
    },
    async getRoute(origin, destination) {
      const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${token}&geometries=polyline`
      );
      if (!res.ok) throw new Error(`Mapbox directions error (${res.status})`);
      const data = (await res.json()) as {
        routes: Array<{ distance: number; duration: number; geometry: string }>;
      };
      const route = data.routes[0];
      return {
        distanceKm: (route?.distance ?? 0) / 1000,
        durationMinutes: Math.max(1, Math.round((route?.duration ?? 0) / 60)),
        polyline: route?.geometry,
        provider: 'mapbox',
      };
    },
  };
}

let cachedProvider: MapsProvider | null = null;

export async function getMapsProvider(): Promise<MapsProvider> {
  if (cachedProvider) return cachedProvider;

  const mode = getResolvedMapsMode();

  try {
    if (mode === 'google' && isGoogleMapsConfigured()) {
      cachedProvider = await createGoogleProvider();
      console.log('Maps provider: Google');
    } else if (mode === 'mapbox' && isMapboxConfigured()) {
      cachedProvider = await createMapboxProvider();
      console.log('Maps provider: Mapbox');
    } else {
      if (env.mapsProvider !== 'fallback' && env.nodeEnv !== 'test') {
        console.warn(`Maps provider: fallback (requested ${env.mapsProvider}, API key missing)`);
      } else {
        console.log('Maps provider: fallback (local/heuristic)');
      }
      cachedProvider = createFallbackProvider();
    }
  } catch (err) {
    console.warn('Maps provider failed, using fallback:', err);
    cachedProvider = createFallbackProvider();
  }

  return cachedProvider;
}

export { haversineKm };
