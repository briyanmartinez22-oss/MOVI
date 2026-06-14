import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/FormUI';
import { MapScreen } from '../../src/components';
import { fetchAdminKpis, fetchDemandZones } from '../../src/services/mockApi';
import { useMockApi } from '../../src/services/api/config';
import {
  getLiveOperationsSnapshot,
  getOperationsMapMarkers,
} from '../../src/services/analyticsService';
import { HotspotFilterBar } from '../../src/components/HotspotFilterBar';
import {
  enrichDemandZones,
  filterDemandZones,
  HotspotFilterState,
} from '../../src/utils/hotspotFilters';
import type { DemandZone } from '../../src/types/models';
import { colors, typography, spacing } from '../../src/theme';

type AdminKpisPayload = {
  operations?: {
    tripsToday?: number;
    deliveriesToday?: number;
    activeDrivers?: number;
    expiredDrivers?: number;
  };
};

export default function AdminOperationsMap() {
  const mockMode = useMockApi();
  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);
  const [adminKpis, setAdminKpis] = useState<AdminKpisPayload | null>(null);
  const [hotspotFilters, setHotspotFilters] = useState<HotspotFilterState>({
    service: 'all',
    vehicleType: 'all',
  });

  useEffect(() => {
    void fetchDemandZones().then(setDemandZones);
    if (!mockMode) {
      void fetchAdminKpis().then((data) => {
        if (data && typeof data === 'object') {
          setAdminKpis(data as AdminKpisPayload);
        }
      });
    }
  }, [mockMode]);

  const live = mockMode
    ? getLiveOperationsSnapshot()
    : {
        connectedDrivers: adminKpis?.operations?.activeDrivers ?? 0,
        activeTrips: 0,
        pendingRequests: 0,
        hotspots: demandZones.filter((z) => z.intensity === 'high').length,
      };

  const markers = mockMode ? getOperationsMapMarkers() : [];
  const hasActiveTrips = markers.some((m) => m.type === 'origin' || m.type === 'destination');
  const filteredDemandZones = useMemo(
    () => filterDemandZones(enrichDemandZones(demandZones), hotspotFilters),
    [demandZones, hotspotFilters]
  );

  return (
    <View style={styles.container}>
      <MapScreen
        showNearbyDrivers={false}
        showDemandHeatmap
        demandZones={filteredDemandZones}
        markers={markers}
        showRoute={hasActiveTrips}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <ScreenHeader title="Mapa operacional" />
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Estado en vivo (store)</Text>
          <Text style={styles.legendText}>Conductores conectados: {live.connectedDrivers}</Text>
          <Text style={styles.legendText}>Viajes activos: {live.activeTrips}</Text>
          <Text style={styles.legendText}>Solicitudes pendientes: {live.pendingRequests}</Text>
          <Text style={styles.legendText}>Hotspots: {filteredDemandZones.length} / {live.hotspots}</Text>
          <HotspotFilterBar filters={hotspotFilters} onChange={setHotspotFilters} compact />
          <Text style={styles.legendMeta}>
            Marcadores: {markers.filter((m) => m.type === 'driver').length} conductores ·{' '}
            {markers.filter((m) => m.type === 'origin').length} viajes en curso
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  legend: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    gap: 4,
  },
  legendTitle: { ...typography.bodyMedium, color: colors.text, marginBottom: 4 },
  legendText: { ...typography.caption, color: colors.text },
  legendMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
