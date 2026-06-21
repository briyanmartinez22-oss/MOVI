import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { LiveDriver } from '../../../types/operationsLive';
import type { MapMarker, TripRequest } from '../../../types';
import { colors, typography, spacing, radius } from '../../../theme';
import { LiveTrackingMapView, type LiveTrackingMapHandle } from './LiveTrackingMapView';

type Props = {
  drivers: LiveDriver[];
  trips: TripRequest[];
  height?: number;
};

function buildStaticMarkers(trips: TripRequest[]): MapMarker[] {
  const markers: MapMarker[] = [];
  trips.forEach((trip) => {
    const origin = trip.origin?.coordinates;
    const dest = trip.destination?.coordinates;
    if (origin?.latitude && origin?.longitude) {
      markers.push({
        id: `trip-origin-${trip.id}`,
        latitude: origin.latitude,
        longitude: origin.longitude,
        type: 'origin',
        label: trip.passengerName.split(' ')[0],
      });
    }
    if (dest?.latitude && dest?.longitude) {
      markers.push({
        id: `trip-dest-${trip.id}`,
        latitude: dest.latitude,
        longitude: dest.longitude,
        type: 'destination',
      });
    }
  });
  return markers;
}

function formatSpeed(speed: number | null): string {
  if (speed == null || speed < 0) return '—';
  const kmh = speed * 3.6;
  return `${kmh.toFixed(0)} km/h`;
}

function formatLastUpdate(iso: string | null): string {
  if (!iso) return 'Sin datos';
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 5) return 'ahora';
  if (diffSec < 60) return `${diffSec}s`;
  return `${Math.round(diffSec / 60)} min`;
}

function formatTripStatus(driver: LiveDriver): string {
  if (!driver.busy) return 'Disponible';
  if (!driver.activeTripStatus) return 'En viaje';
  return driver.activeTripStatus.replace(/_/g, ' ');
}

export function LiveMap({ drivers, trips, height = 280 }: Props) {
  const mapRef = useRef<LiveTrackingMapHandle>(null);
  const prevPositionsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const staticMarkers = useMemo(() => buildStaticMarkers(trips), [trips]);
  const selectedDriver = drivers.find((d) => d.driverId === selectedDriverId) ?? null;

  useEffect(() => {
    drivers.forEach((driver) => {
      if (driver.latitude == null || driver.longitude == null) return;
      const prev = prevPositionsRef.current.get(driver.driverId);
      const moved =
        !prev ||
        prev.lat !== driver.latitude ||
        prev.lng !== driver.longitude ||
        driver.locationUpdatedAt;
      if (moved) {
        mapRef.current?.updateDriver(driver);
        prevPositionsRef.current.set(driver.driverId, {
          lat: driver.latitude,
          lng: driver.longitude,
        });
      }
    });
  }, [drivers]);

  return (
    <View style={[styles.container, { height }]}>
      <LiveTrackingMapView
        ref={mapRef}
        drivers={drivers}
        staticMarkers={staticMarkers}
        onDriverSelect={setSelectedDriverId}
      />

      {selectedDriver ? (
        <View style={styles.infoPanel}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>{selectedDriver.name}</Text>
            <TouchableOpacity onPress={() => setSelectedDriverId(null)}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoLine}>Unidad: {selectedDriver.unitNumber ?? '—'}</Text>
          <Text style={styles.infoLine}>Velocidad: {formatSpeed(selectedDriver.speed)}</Text>
          <Text style={styles.infoLine}>
            Última actualización: {formatLastUpdate(selectedDriver.locationUpdatedAt)}
          </Text>
          <Text style={styles.infoLine}>Estado viaje: {formatTripStatus(selectedDriver)}</Text>
        </View>
      ) : (
        <View style={styles.legend} pointerEvents="none">
          <Text style={styles.legendText}>
            {drivers.length} conductores · tap en marcador para detalle · live WS
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  legend: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  legendText: { ...typography.caption, color: colors.textSecondary },
  infoPanel: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoTitle: { ...typography.bodyMedium, color: colors.text },
  close: { ...typography.body, color: colors.textMuted, padding: spacing.xs },
  infoLine: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
