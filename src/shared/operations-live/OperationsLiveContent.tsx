import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/FormUI';
import {
  DispatchDriverModal,
  IntelligentAlertCenter,
  LiveMap,
  LiveTripsTable,
  OperationsLiveKpiBar,
  ReassignDriverModal,
  TripDetailModal,
} from '../../components/admin/operations-live';
import { useOperationsLive } from '../../hooks/useOperationsLive';
import {
  adminCancelTripApi,
  adminDispatchTripApi,
  adminReassignTripApi,
  ackAdminAlertApi,
  resolveAdminAlertApi,
  fetchOperationsLiveTripDetail,
} from '../../services/api';
import type { TripRequest } from '../../types';
import type { OperationalAlertRecord } from '../../types/adminCenter';
import { colors, typography, spacing } from '../../theme';

/**
 * Shared Operations Live screen — business logic, websocket state, and actions.
 * Platform-specific shells (web/mobile) render this component.
 */
export function OperationsLiveContent() {
  const router = useRouter();
  const { snapshot, drivers, trips, alerts, loading, refreshing, mockMode, reload } =
    useOperationsLive();

  const [detailTrip, setDetailTrip] = useState<TripRequest | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [reassignTripId, setReassignTripId] = useState<string | null>(null);
  const [reassignVisible, setReassignVisible] = useState(false);
  const [dispatchTripId, setDispatchTripId] = useState<string | null>(null);
  const [dispatchVisible, setDispatchVisible] = useState(false);

  const handleViewTrip = useCallback(async (trip: TripRequest) => {
    const detail = await fetchOperationsLiveTripDetail(trip.id);
    setDetailTrip(detail ?? trip);
    setDetailVisible(true);
  }, []);

  const handleReassignTrip = useCallback((trip: TripRequest) => {
    setReassignTripId(trip.id);
    setReassignVisible(true);
  }, []);

  const handleCancelTrip = useCallback(
    (trip: TripRequest) => {
      Alert.alert(
        'Cancelar viaje',
        `¿Cancelar el viaje de ${trip.passengerName}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sí, cancelar',
            style: 'destructive',
            onPress: () => {
              void adminCancelTripApi(trip.id).then((res) => {
                if (!res.ok) {
                  Alert.alert('Error', res.error ?? 'No se pudo cancelar');
                  return;
                }
                void reload();
              });
            },
          },
        ]
      );
    },
    [reload]
  );

  const handleDispatchTrip = useCallback((trip: TripRequest) => {
    setDispatchTripId(trip.id);
    setDispatchVisible(true);
  }, []);

  const handleDispatchConfirm = useCallback(
    async (driverId: string) => {
      if (!dispatchTripId) return;
      const res = await adminDispatchTripApi(dispatchTripId, driverId);
      if (!res.ok) {
        Alert.alert('Error', res.error ?? 'No se pudo asignar');
        throw new Error(res.error);
      }
      void reload();
    },
    [dispatchTripId, reload]
  );

  const handleAlertSelect = useCallback(
    (alert: OperationalAlertRecord) => {
      if (alert.entityType === 'trip') {
        const trip = trips.find((t) => t.id === alert.entityId);
        if (trip) {
          router.push(`/admin/trips/${alert.entityId}` as never);
          return;
        }
      }
      void fetchOperationsLiveTripDetail(alert.entityId).then((detail) => {
        if (detail) {
          setDetailTrip(detail);
          setDetailVisible(true);
        }
      });
    },
    [trips, router]
  );

  const handleAckAlert = useCallback(
    (alert: OperationalAlertRecord) => {
      void ackAdminAlertApi(alert.id).then((res) => {
        if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo confirmar');
        else void reload();
      });
    },
    [reload]
  );

  const handleResolveAlert = useCallback(
    (alert: OperationalAlertRecord) => {
      void resolveAdminAlertApi(alert.id).then((res) => {
        if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo resolver');
        else void reload();
      });
    },
    [reload]
  );

  const handleViewTripNav = useCallback(
    (trip: TripRequest) => {
      router.push(`/admin/trips/${trip.id}` as never);
    },
    [router]
  );

  const handleReassignConfirm = useCallback(
    async (driverId: string) => {
      if (!reassignTripId) return;
      const res = await adminReassignTripApi(reassignTripId, driverId);
      if (!res.ok) {
        Alert.alert('Error', res.error ?? 'No se pudo reasignar');
        throw new Error(res.error);
      }
      void reload();
    },
    [reassignTripId, reload]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Centro de operaciones"
          onBack={() => router.replace('/admin')}
        />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Centro de operaciones"
        onBack={() => router.replace('/admin')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />
        }
      >
        <Text style={styles.note}>
          {mockMode ? 'Modo simulación — datos demo' : 'Live · PostgreSQL + WebSocket'}
        </Text>

        <OperationsLiveKpiBar snapshot={snapshot} />
        <LiveMap drivers={drivers} trips={trips} />
        <IntelligentAlertCenter
          alerts={alerts}
          onSelectAlert={handleAlertSelect}
          onAck={handleAckAlert}
          onResolve={handleResolveAlert}
        />
        <LiveTripsTable
          trips={trips}
          onViewTrip={handleViewTripNav}
          onReassignTrip={handleReassignTrip}
          onCancelTrip={handleCancelTrip}
          onDispatchTrip={handleDispatchTrip}
        />
      </ScrollView>

      <TripDetailModal
        visible={detailVisible}
        trip={detailTrip}
        onClose={() => setDetailVisible(false)}
      />
      <DispatchDriverModal
        visible={dispatchVisible}
        tripId={dispatchTripId}
        onClose={() => setDispatchVisible(false)}
        onConfirm={handleDispatchConfirm}
      />
      <ReassignDriverModal
        visible={reassignVisible}
        tripId={reassignTripId}
        onClose={() => setReassignVisible(false)}
        onConfirm={handleReassignConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
