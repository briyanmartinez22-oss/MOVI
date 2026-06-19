import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/FormUI';
import { MapScreen } from '../../src/components';
import { fetchAdminMetricsSummary, fetchAdminMetricsTrips, fetchDemandZones } from '../../src/services/api';
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
import type { AdminMetricsSummary, AdminMetricsTrips } from '../../src/types/adminMetrics';
import { colors, typography, spacing } from '../../src/theme';

export default function AdminOperationsMap() {
  const mockMode = useMockApi();
  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);
  const [summary, setSummary] = useState<AdminMetricsSummary | null>(null);
  const [tripMetrics, setTripMetrics] = useState<AdminMetricsTrips | null>(null);
  const [hotspotFilters, setHotspotFilters] = useState<HotspotFilterState>({
    service: 'all',
    vehicleType: 'all',
  });

  useEffect(() => {
    void fetchDemandZones().then(setDemandZones);
    if (!mockMode) {
      void fetchAdminMetricsSummary().then((data) => setSummary(data ?? null));
      void fetchAdminMetricsTrips().then((data) => setTripMetrics(data ?? null));
    }
  }, [mockMode]);

  const live = mockMode
    ? getLiveOperationsSnapshot()
    : {
        connectedDrivers: summary?.driversOnline ?? 0,
        activeTrips: summary?.tripsActive ?? 0,
        pendingRequests: tripMetrics?.pendingRequests ?? 0,
        hotspots: demandZones.filter((z) => z.intensity === 'high').length,
      };

  const markers = mockMode ? getOperationsMapMarkers() : [];
  const hasActiveTrips = (summary?.tripsActive ?? 0) > 0;
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
          <Text style={styles.legendTitle}>
            {mockMode ? 'Estado en vivo (simulación)' : 'Estado en vivo (PostgreSQL)'}
          </Text>
          <Text style={styles.legendText}>Conductores conectados: {live.connectedDrivers}</Text>
          <Text style={styles.legendText}>Viajes activos: {live.activeTrips}</Text>
          <Text style={styles.legendText}>
            Solicitudes pendientes: {mockMode ? live.pendingRequests : live.pendingRequests}
          </Text>
          <Text style={styles.legendText}>
            Hotspots: {filteredDemandZones.length} / {live.hotspots}
          </Text>
          <HotspotFilterBar filters={hotspotFilters} onChange={setHotspotFilters} compact />
          {!mockMode && (
            <Text style={styles.legendMeta}>
              Ofertas enviadas: {summary?.totalOffers ?? 0} · Completados:{' '}
              {summary?.tripsCompleted ?? 0}
            </Text>
          )}
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
