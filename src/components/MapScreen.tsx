import { View, StyleSheet } from 'react-native';
import { MoviMapView, MapRoute } from './MoviMapView';
import { DemandHeatmapLegend } from './DemandHeatmapLegend';
import { MapMarker } from '../types';
import { DemandZone } from '../types/models';

type Props = {
  showRoute?: boolean;
  showDestination?: boolean;
  showNearbyDrivers?: boolean;
  showDemandHeatmap?: boolean;
  demandZones?: DemandZone[];
  markers?: MapMarker[];
  route?: MapRoute;
  children?: React.ReactNode;
};

export function MapScreen({
  showRoute = false,
  showDestination = false,
  showNearbyDrivers = false,
  showDemandHeatmap = false,
  demandZones = [],
  markers = [],
  route,
  children,
}: Props) {
  return (
    <View style={styles.container}>
      <MoviMapView
        markers={markers}
        route={showRoute ? route : undefined}
        showNearbyDrivers={showNearbyDrivers ?? (!showRoute && !showDestination)}
        showDemandHeatmap={showDemandHeatmap}
        demandZones={demandZones}
      />
      {showDemandHeatmap && demandZones.length > 0 ? (
        <View style={styles.legendOverlay} pointerEvents="none">
          <DemandHeatmapLegend compact />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  legendOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
  },
});
