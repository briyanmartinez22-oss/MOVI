import { Coordinates, MapMarker } from '../../types';
import { MapRoute } from '../../components/MoviMapView';

/**
 * Abstracción del mapa para migrar a @maplibre/maplibre-react-native
 * en builds nativos sin cambiar las pantallas.
 */
export interface MapAdapter {
  render(props: MapAdapterProps): React.ReactNode;
}

export interface MapAdapterProps {
  markers: MapMarker[];
  route?: MapRoute;
  showNearbyDrivers?: boolean;
  center?: Coordinates;
}

export type NavigationProvider = 'waze' | 'maplibre-future';

export const MAP_CONFIG = {
  provider: 'maplibre-webview' as const,
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  futureNativePackage: '@maplibre/maplibre-react-native',
};
