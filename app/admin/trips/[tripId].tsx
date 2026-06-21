import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, Card } from '../../../src/components/FormUI';
import {
  LiveTrackingMapView,
  ReassignDriverModal,
} from '../../../src/components/admin/operations-live';
import {
  adminCancelTripApi,
  adminReassignTripApi,
  createSupportTicketApi,
  fetchTrip360,
} from '../../../src/services/api';
import { useMockApi } from '../../../src/services/api/config';
import type { Trip360Data } from '../../../src/types/adminCenter';
import type { LiveDriver } from '../../../src/types/operationsLive';
import type { MapMarker } from '../../../src/types';
import { colors, typography, spacing, radius } from '../../../src/theme';

const TIMELINE_LABELS: Record<string, string> = {
  requested: 'Solicitado',
  offered: 'Ofertado',
  accepted: 'Aceptado',
  driver_arriving: 'Conductor en camino',
  driver_arrived: 'Conductor llegó',
  trip_started: 'Viaje iniciado',
  trip_completed: 'Completado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export default function TripDetail360Screen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const mockMode = useMockApi();
  const [data, setData] = useState<Trip360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [reassignVisible, setReassignVisible] = useState(false);

  const load = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    const result = await fetchTrip360(tripId);
    setData(result ?? null);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mapDrivers = useMemo((): LiveDriver[] => {
    if (!data?.liveDriver || !data.driver) return [];
    return [
      {
        driverId: data.driver.id,
        sessionId: 'trip-360',
        name: data.driver.name,
        vehicleType: data.vehicle?.vehicleType ?? null,
        unitNumber: data.vehicle?.unitNumber ?? null,
        plateNumber: data.vehicle?.plateNumber ?? null,
        busy: true,
        activeTripId: data.trip.id,
        activeTripStatus: data.trip.lifecycleStatus,
        latitude: data.liveDriver.latitude,
        longitude: data.liveDriver.longitude,
        speed: data.liveDriver.speed,
        heading: null,
        locationUpdatedAt: data.liveDriver.locationUpdatedAt,
        connectedAt: data.liveDriver.locationUpdatedAt ?? new Date().toISOString(),
      },
    ];
  }, [data]);

  const staticMarkers = useMemo((): MapMarker[] => {
    if (!data) return [];
    const markers: MapMarker[] = [];
    const origin = data.trip.origin?.coordinates;
    const dest = data.trip.destination?.coordinates;
    if (origin?.latitude && origin?.longitude) {
      markers.push({
        id: 'origin',
        latitude: origin.latitude,
        longitude: origin.longitude,
        type: 'origin',
        label: 'Origen',
      });
    }
    if (dest?.latitude && dest?.longitude) {
      markers.push({
        id: 'dest',
        latitude: dest.latitude,
        longitude: dest.longitude,
        type: 'destination',
        label: 'Destino',
      });
    }
    return markers;
  }, [data]);

  const handleCancel = () => {
    if (!data) return;
    Alert.alert('Cancelar viaje', '¿Confirmar cancelación?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        style: 'destructive',
        onPress: () => {
          void adminCancelTripApi(data.trip.id).then((res) => {
            if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo cancelar');
            else void load();
          });
        },
      },
    ]);
  };

  const handleReassignConfirm = async (driverId: string) => {
    if (!data) return;
    const res = await adminReassignTripApi(data.trip.id, driverId);
    if (!res.ok) {
      Alert.alert('Error', res.error ?? 'No se pudo reasignar');
      throw new Error(res.error);
    }
    void load();
  };

  const handleContact = (phone: string) => {
    void Linking.openURL(`tel:${phone}`);
  };

  const handleCreateTicket = () => {
    if (!data?.passenger) return;
    void createSupportTicketApi({
      userId: data.passenger.id,
      subject: `Viaje ${data.trip.id}`,
      description: `Ticket desde detalle 360 — estado ${data.trip.lifecycleStatus}`,
      tripId: data.trip.id,
      driverId: data.driver?.id ?? '',
      category: 'trip',
    }).then((res) => {
      if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo crear ticket');
      else Alert.alert('Ticket creado', 'Se abrió en soporte operativo.');
    });
  };

  const handleIncident = () => {
    if (!data?.passenger) return;
    void createSupportTicketApi({
      userId: data.passenger.id,
      subject: `Incidente — viaje ${data.trip.id}`,
      description: 'Marcado como incidente desde Trip 360',
      tripId: data.trip.id,
      category: 'incident',
      priority: 'urgent',
    }).then((res) => {
      if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo registrar');
      else Alert.alert('Incidente registrado');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Viaje 360" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Viaje 360" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.muted}>Viaje no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { trip, passenger, driver, vehicle } = data;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Viaje 360" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          {mockMode ? 'Modo simulación' : 'PostgreSQL · live GPS'}
        </Text>

        <Card style={styles.block}>
          <Text style={styles.section}>Resumen</Text>
          <Text style={styles.line}>ID: {trip.id}</Text>
          <Text style={styles.line}>Estado: {trip.lifecycleStatus}</Text>
          <Text style={styles.line}>Pasajero: {passenger?.fullName ?? trip.passengerName}</Text>
          <Text style={styles.line}>
            Conductor: {driver?.name ?? data.trip.acceptedOffer?.driver?.name ?? 'Sin asignar'}
          </Text>
          {vehicle ? (
            <Text style={styles.line}>
              Vehículo: {vehicle.vehicleType} · {vehicle.unitNumber} · {vehicle.plateNumber}
            </Text>
          ) : null}
          <Text style={styles.line}>Origen: {trip.origin?.name ?? '—'}</Text>
          <Text style={styles.line}>Destino: {trip.destination?.name ?? '—'}</Text>
          <Text style={styles.line}>
            Precio: ${data.price ?? trip.passengerOfferPrice ?? '—'}
          </Text>
          {driver ? (
            <Text style={styles.line}>Calificación conductor: ⭐ {driver.rating.toFixed(1)}</Text>
          ) : null}
          {data.ratings && data.ratings.length > 0 ? (
            <Text style={styles.line}>
              Calificaciones del viaje: {data.ratings.map((r) => `${r.raterRole}→${r.rateeRole} ${r.stars}★`).join(' · ')}
            </Text>
          ) : null}
          <Text style={styles.line}>Creado: {new Date(trip.createdAt).toLocaleString()}</Text>
        </Card>

        <Text style={styles.section}>Mapa</Text>
        <View style={styles.mapWrap}>
          <LiveTrackingMapView drivers={mapDrivers} staticMarkers={staticMarkers} />
        </View>

        <Text style={styles.section}>Timeline</Text>
        {data.timeline.map((step) => (
          <View key={step.step} style={styles.timelineRow}>
            <Ionicons
              name={step.reached ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={step.reached ? colors.primary : colors.textMuted}
            />
            <Text style={styles.timelineText}>
              {TIMELINE_LABELS[step.step] ?? step.step}
              {step.at ? ` · ${new Date(step.at).toLocaleString()}` : ''}
            </Text>
          </View>
        ))}

        <Text style={styles.section}>Logs</Text>
        <Card style={styles.block}>
          <Text style={styles.subSection}>Auditoría ({data.logs.audit.length})</Text>
          {data.logs.audit.slice(0, 5).map((log) => (
            <Text key={log.id} style={styles.logLine}>
              {log.action} · {log.createdAt}
            </Text>
          ))}
          <Text style={styles.subSection}>Notificaciones ({data.logs.notifications.length})</Text>
          {data.logs.notifications.slice(0, 5).map((n) => (
            <Text key={n.id} style={styles.logLine}>
              {n.title}: {n.body}
            </Text>
          ))}
          <Text style={styles.subSection}>OTP ({data.logs.otp.length})</Text>
          {data.logs.otp.slice(0, 5).map((o) => (
            <Text key={o.id} style={styles.logLine}>
              {o.verified ? 'OK' : 'Fallido'} · {o.createdAt}
            </Text>
          ))}
        </Card>

        <Text style={styles.section}>Acciones</Text>
        <View style={styles.actions}>
          <ActionBtn icon="close-circle" label="Cancelar" onPress={handleCancel} />
          <ActionBtn icon="swap-horizontal" label="Reasignar" onPress={() => setReassignVisible(true)} />
          {passenger?.phoneNumber ? (
            <ActionBtn
              icon="call"
              label="Pasajero"
              onPress={() => handleContact(passenger.phoneNumber)}
            />
          ) : null}
          {driver?.phone ? (
            <ActionBtn icon="call" label="Conductor" onPress={() => handleContact(driver.phone)} />
          ) : null}
          <ActionBtn icon="ticket" label="Ticket" onPress={handleCreateTicket} />
          <ActionBtn icon="warning" label="Incidente" onPress={handleIncident} />
        </View>
      </ScrollView>

      <ReassignDriverModal
        visible={reassignVisible}
        tripId={trip.id}
        onClose={() => setReassignVisible(false)}
        onConfirm={handleReassignConfirm}
      />
    </SafeAreaView>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  subSection: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  block: { padding: spacing.md },
  line: { ...typography.body, color: colors.text, marginBottom: spacing.xs },
  muted: { ...typography.body, color: colors.textMuted },
  mapWrap: { height: 240, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  timelineText: { ...typography.body, color: colors.text, flex: 1 },
  logLine: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  actionLabel: { ...typography.caption, color: colors.text },
});
