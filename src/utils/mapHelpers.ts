import { MapMarker, Place } from '../types';
import { MapRoute } from '../components/MoviMapView';

export function buildRouteFromPlaces(origin: Place, destination: Place): MapRoute {
  return {
    origin: origin.coordinates,
    destination: destination.coordinates,
  };
}

export function buildTripMarkers(
  origin?: Place | null,
  destination?: Place | null,
  includeUser = true
): MapMarker[] {
  const markers: MapMarker[] = [];

  if (includeUser && origin) {
    markers.push({
      id: 'user',
      latitude: origin.coordinates.latitude,
      longitude: origin.coordinates.longitude,
      type: 'user',
    });
  }

  if (origin) {
    markers.push({
      id: 'origin',
      latitude: origin.coordinates.latitude,
      longitude: origin.coordinates.longitude,
      type: 'origin',
      label: origin.name,
    });
  }

  if (destination) {
    markers.push({
      id: 'destination',
      latitude: destination.coordinates.latitude,
      longitude: destination.coordinates.longitude,
      type: 'destination',
      label: destination.name,
    });
  }

  return markers;
}
