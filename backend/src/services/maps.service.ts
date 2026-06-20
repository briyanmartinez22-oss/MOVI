import { getMapsProvider, type Coordinates } from './mapsProvider';
import { getResolvedMapsMode, isGoogleMapsConfigured } from '../config/env';

const SAN_SALVADOR_ORIGIN: Coordinates = { latitude: 13.699, longitude: -89.2244 };
const SAN_SALVADOR_DEST: Coordinates = { latitude: 13.6769, longitude: -89.2795 };

export type MapsConnectionResult = {
  configured: boolean;
  active: string;
  provider: string;
  geocodeTest: 'ok' | 'failed' | 'skipped';
  reverseGeocodeTest: 'ok' | 'failed' | 'skipped';
  distanceTest: 'ok' | 'failed' | 'skipped';
  routeTest: 'ok' | 'failed' | 'skipped';
  sampleAddress: string | null;
  sampleRouteKm: number | null;
  sampleEtaMinutes: number | null;
  error: string | null;
};

export async function verifyMapsConnection(): Promise<MapsConnectionResult> {
  const active = getResolvedMapsMode();
  const base: MapsConnectionResult = {
    configured: active !== 'fallback' || isGoogleMapsConfigured(),
    active,
    provider: active,
    geocodeTest: 'skipped',
    reverseGeocodeTest: 'skipped',
    distanceTest: 'skipped',
    routeTest: 'skipped',
    sampleAddress: null,
    sampleRouteKm: null,
    sampleEtaMinutes: null,
    error: null,
  };

  try {
    const maps = await getMapsProvider();
    base.provider = maps.mode;

    const geocodeResults = await maps.geocode('Metrocentro San Salvador');
    if (geocodeResults.length > 0) {
      base.geocodeTest = 'ok';
      base.sampleAddress = geocodeResults[0]?.name ?? null;
    } else {
      base.geocodeTest = 'failed';
      base.error = 'Geocoding no devolvió resultados';
      return base;
    }

    const reverseName = await maps.reverseGeocode(SAN_SALVADOR_ORIGIN);
    base.reverseGeocodeTest = reverseName ? 'ok' : 'failed';
    if (!reverseName) {
      base.error = 'Reverse geocoding falló';
      return base;
    }

    const route = await maps.getRoute(SAN_SALVADOR_ORIGIN, SAN_SALVADOR_DEST);
    if (route.distanceKm > 0 && route.durationMinutes > 0) {
      base.routeTest = 'ok';
      base.distanceTest = 'ok';
      base.sampleRouteKm = Number(route.distanceKm.toFixed(2));
      base.sampleEtaMinutes = route.durationMinutes;
    } else {
      base.routeTest = 'failed';
      base.error = 'Ruta sin distancia o ETA válidos';
    }

    return base;
  } catch (error) {
    return {
      ...base,
      geocodeTest: base.geocodeTest === 'ok' ? 'ok' : 'failed',
      error: error instanceof Error ? error.message : 'Error desconocido al conectar Maps',
    };
  }
}
