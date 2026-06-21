import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MapScreen,
  BottomCard,
  PrimaryButton,
  DriverAvatar,
  PriceStepper,
  VehicleBadge,
  DemandHeatmapLegend,
  MoviLogo,
  CancelTripButton,
} from '../../src/components';
import { HotspotFilterBar } from '../../src/components/HotspotFilterBar';
import { mockPassenger } from '../../src/data/mock';
import { useTrip } from '../../src/context/TripContext';
import { useAuth, formatTime } from '../../src/context/AuthContext';
import { formatDistance, formatEta } from '../../src/utils/geo';
import { getMinPrice, formatPrice } from '../../src/utils/pricing';
import { fetchDemandZones } from '../../src/services/mockApi';
import { DemandZone } from '../../src/types/models';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { HelpButton } from '../../src/components/HelpButton';
import { canOperate } from '../../src/types/models';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import {
  getDriverByUserId,
  getDriverDashboardStats,
  getDriverSubscription,
  getOwnerById,
  getVehicle,
} from '../../src/services/profileData';
import {
  canDriverOperateSubscription,
  resolveSubscriptionStatus,
  formatSubscriptionStatus,
} from '../../src/services/subscriptionService';
import { isDriverTripActive } from '../../src/utils/driverTripFlow';
import { REQUEST_TYPE_LABELS, SERVICE_TYPE_LABELS } from '../../src/utils/serviceLabels';
import {
  enrichDemandZones,
  filterDemandZones,
  HotspotFilterState,
} from '../../src/utils/hotspotFilters';
import { useMockApi } from '../../src/services/api/config';
import { fetchScheduledTrips, fetchDriverReservations } from '../../src/services/api';
import { ContextualHelpLink } from '../../src/components/help/ContextualHelpLink';
import { colors, typography, spacing, radius } from '../../src/theme';

const DRIVER_REQUEST_STATUS_LABELS: Record<string, string> = {
  offline: 'Desconectado — conéctate para recibir solicitudes',
  waiting: 'Esperando solicitudes',
  new_request: 'Nueva solicitud disponible',
  expired: 'Solicitud expirada',
  unavailable: 'No hay servicios disponibles',
};

export default function DriverHome() {
  const router = useRouter();
  const { user, getDailySessionSummary } = useAuth();
  const { loading: profileLoading, error } = useProfileBootstrap();
  const {
    activeTrip,
    tripType,
    isDriverOnline,
    activeSession,
    availableTripsCount,
    driverRequestStatus,
    connectDriver,
    disconnectDriver,
    submitDriverOffer,
    getDriverEtaToPickup,
    getTripDistanceKm,
    refreshDriverSession,
  } = useTrip();

  const [showRequest, setShowRequest] = useState(false);
  const [offerPrice, setOfferPrice] = useState(getMinPrice('shared'));
  const [loading, setLoading] = useState(false);
  const [hotspotFilters, setHotspotFilters] = useState<HotspotFilterState>({
    service: 'all',
    vehicleType: 'all',
  });
  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);
  const [scheduledTripsCount, setScheduledTripsCount] = useState(0);
  const [reservationsCount, setReservationsCount] = useState(0);
  const notifiedTripIdRef = useRef<string | null>(null);

  useEffect(() => {
    void fetchDemandZones().then(setDemandZones);
  }, []);

  const driverRecord = user ? getDriverByUserId(user.userId) : undefined;
  const vehicle = driverRecord ? getVehicle(driverRecord.vehicleId) : undefined;
  const owner = driverRecord ? getOwnerById(driverRecord.ownerId) : undefined;
  const subscription = driverRecord ? getDriverSubscription(driverRecord.id) : undefined;
  const subGuard = canDriverOperateSubscription(subscription);
  const operation = canOperate(
    owner,
    vehicle,
    driverRecord,
    !subGuard.allowed,
    subGuard.reason
  );
  const subStatus = subscription ? resolveSubscriptionStatus(subscription) : null;
  const summary = driverRecord ? getDailySessionSummary(driverRecord.id) : null;

  useEffect(() => {
    if (driverRecord) refreshDriverSession(driverRecord.id);
  }, [driverRecord, refreshDriverSession]);

  useEffect(() => {
    if (!isDriverOnline || useMockApi()) return;
    const loadLists = () => {
      void fetchScheduledTrips().then((res) => {
        if (res.ok) setScheduledTripsCount(res.data?.length ?? 0);
      });
      void fetchDriverReservations().then((res) => {
        if (res.ok) setReservationsCount(res.data?.length ?? 0);
      });
    };
    loadLists();
    const timer = setInterval(loadLists, 15000);
    return () => clearInterval(timer);
  }, [isDriverOnline]);

  useEffect(() => {
    if (!isDriverOnline || !activeTrip || activeTrip.status !== 'searching') {
      setShowRequest(false);
      return;
    }
    setOfferPrice(getMinPrice(activeTrip.tripType));
    setShowRequest(true);
  }, [isDriverOnline, activeTrip?.id, activeTrip?.status, activeTrip?.tripType]);

  const isAssignedToMe =
    !!activeTrip?.acceptedOffer &&
    !!driverRecord &&
    activeTrip.acceptedOffer.driverId === driverRecord.id;

  useEffect(() => {
    if (!isAssignedToMe || !activeTrip) return;
    if (activeTrip.lifecycleStatus !== 'accepted') return;
    if (notifiedTripIdRef.current === activeTrip.id) return;

    notifiedTripIdRef.current = activeTrip.id;
    Alert.alert(
      '¡Viaje aceptado!',
      `${activeTrip.passengerName} aceptó tu oferta. Ve al punto de recogida.`,
      [
        { text: 'Ver viaje', onPress: () => router.push('/driver/trip-active') },
        { text: 'Después', style: 'cancel' },
      ]
    );
    router.push('/driver/trip-active');
  }, [activeTrip?.id, activeTrip?.lifecycleStatus, isAssignedToMe, router, activeTrip]);

  const handleToggle = async () => {
    if (!driverRecord || !vehicle) {
      Alert.alert('Error', 'Perfil de conductor no encontrado');
      return;
    }
    if (!operation.allowed && !isDriverOnline) {
      Alert.alert('No disponible', operation.reason ?? 'No puedes operar');
      return;
    }

    setLoading(true);
    if (isDriverOnline) {
      const res = await disconnectDriver(driverRecord.id);
      setLoading(false);
      if (!res.ok) Alert.alert('Error', res.message);
      else setShowRequest(false);
    } else {
      const res = await connectDriver(driverRecord.id, vehicle.vehicleId);
      setLoading(false);
      if (!res.ok) Alert.alert('Error', res.message);
    }
    refreshDriverSession(driverRecord.id);
  };

  const handleSubmitOffer = () => {
    submitDriverOffer(offerPrice, user?.userId);
    setShowRequest(false);
    Alert.alert('Oferta enviada', 'Tu oferta fue enviada al pasajero.');
  };

  const etaToPickup = getDriverEtaToPickup(user?.userId);
  const tripDistance = activeTrip?.distanceKm ?? (activeTrip ? getTripDistanceKm() : 0);
  const driverStats = driverRecord ? getDriverDashboardStats(driverRecord.id) : undefined;
  const todayEarnings = summary?.totalCashCollected ?? 0;
  const todayTrips = summary?.totalTrips ?? 0;
  const weekEarnings = driverStats?.earningsWeek ?? todayEarnings * 5;
  const monthEarnings = driverStats?.earningsMonth ?? todayEarnings * 22;
  const filteredDemandZones = filterDemandZones(
    enrichDemandZones(demandZones),
    hotspotFilters
  );

  const requestStatusLabel = !operation.allowed
    ? DRIVER_REQUEST_STATUS_LABELS.unavailable
    : DRIVER_REQUEST_STATUS_LABELS[driverRequestStatus] ?? DRIVER_REQUEST_STATUS_LABELS.waiting;

  if (profileLoading) {
    return <BrandedLoadingView message="Cargando perfil…" />;
  }

  return (
    <View style={styles.container}>
      <MapScreen
        showNearbyDrivers
        showDemandHeatmap
        demandZones={filteredDemandZones}
      />

      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/driver/history')}>
          <Ionicons name="time-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/driver/subscription')}>
          <Ionicons name="card-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => router.replace('/')}>
          <Ionicons name="menu" size={22} color={colors.text} />
        </TouchableOpacity>
        <MoviLogo size="sm" />
        <HelpButton compact />
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: isDriverOnline ? colors.online : colors.offline }]} />
          <Text style={styles.statusText}>{isDriverOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </SafeAreaView>

      <View style={styles.bottomArea}>
        <BottomCard>
          {isDriverOnline && (
            <View style={styles.hotspotsSection}>
              <Text style={styles.hotspotsTitle}>Mapa de hotspots</Text>
              <Text style={styles.hotspotsHint}>
                Zonas con más solicitudes — filtra por servicio y vehículo.
              </Text>
              <HotspotFilterBar
                filters={hotspotFilters}
                onChange={setHotspotFilters}
                compact
              />
              <DemandHeatmapLegend compact />
              <Text style={styles.hotspotsCount}>
                {filteredDemandZones.length} zona{filteredDemandZones.length === 1 ? '' : 's'} visibles
              </Text>
            </View>
          )}

          {isDriverOnline && (
            <View style={styles.listsSection}>
              <Text style={styles.listsTitle}>Solicitudes</Text>
              <Text style={styles.listsLine}>Cercanas ahora: {availableTripsCount}</Text>
              <Text style={styles.listsLine}>Programadas disponibles: {scheduledTripsCount}</Text>
              <Text style={styles.listsLine}>Mis reservas: {reservationsCount}</Text>
            </View>
          )}

          {vehicle && (
            <View style={styles.unitRow}>
              <VehicleBadge type={vehicle.vehicleType} compact />
              <Text style={styles.unitText}>Unidad #{vehicle.unitNumber} · {vehicle.plateNumber}</Text>
            </View>
          )}

          {subStatus && (
            <Text style={styles.subLine}>
              Suscripción: {formatSubscriptionStatus(subStatus)} · $7/mes tras prueba gratis
            </Text>
          )}

          {!operation.allowed && (
            <>
              <Text style={styles.warning}>{operation.reason}</Text>
              <PrimaryButton
                title="Ver estado de verificación"
                variant="outline"
                onPress={() => router.push('/driver/verification-status')}
                style={{ marginBottom: spacing.sm }}
              />
            </>
          )}

          {isDriverOnline && (
            <View style={styles.requestStatusBox}>
              <Text style={styles.requestStatusText}>{requestStatusLabel}</Text>
              {availableTripsCount > 0 && activeTrip?.status !== 'searching' ? (
                <Text style={styles.requestStatusMeta}>
                  {availableTripsCount} solicitud{availableTripsCount === 1 ? '' : 'es'} en cola
                </Text>
              ) : null}
            </View>
          )}

          {error ? <Text style={styles.warning}>{error}</Text> : null}

          <Text style={styles.earningsLabel}>Dinero hoy</Text>
          <Text style={styles.earningsValue}>{formatPrice(todayEarnings)}</Text>
          <Text style={styles.tripsCount}>
            Semana: {formatPrice(weekEarnings)} · Mes: {formatPrice(monthEarnings)}
          </Text>
          <Text style={styles.tripsCount}>
            {todayTrips} viajes hoy · {driverStats?.tripsMonth ?? 0} mes ·{' '}
            {driverStats?.deliveriesMonth ?? 0} entregas · {summary?.connectionCount ?? 0} sesiones
          </Text>

          {activeSession && (
            <Text style={styles.sessionInfo}>
              Conectado desde {formatTime(activeSession.connectedAt)}
            </Text>
          )}

          <PrimaryButton
            title={isDriverOnline ? 'Desconectarse' : 'Conectarse'}
            onPress={handleToggle}
            variant={isDriverOnline ? 'secondary' : 'primary'}
            loading={loading}
            disabled={!operation.allowed && !isDriverOnline}
            style={styles.toggleBtn}
          />

          {isAssignedToMe && isDriverTripActive(activeTrip?.lifecycleStatus, true) && (
            <>
              <PrimaryButton
                title="Ver viaje aceptado"
                onPress={() => router.push('/driver/trip-active')}
                style={styles.assignedBtn}
              />
              <CancelTripButton by="driver" style={styles.cancelBtn} />
            </>
          )}
          <ContextualHelpLink sectionId="driver-guide" />
        </BottomCard>
      </View>

      <Modal visible={showRequest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.requestCard}>
            <Text style={styles.requestTitle}>Nueva solicitud</Text>
            <View style={styles.passengerRow}>
              <DriverAvatar name={mockPassenger.name} size={48} />
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>{activeTrip?.passengerName ?? mockPassenger.name}</Text>
                <Text style={styles.tripTypeLabel}>
                  {activeTrip?.tripType === 'private' ? 'Mototaxi Privado' : 'Mototaxi Compartido'}
                </Text>
              </View>
            </View>
            <View style={styles.routeCard}>
              <Text style={styles.routeValue}>{activeTrip?.origin.name}</Text>
              <Text style={styles.routeLabel}>→ {activeTrip?.destination.name}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{formatDistance(tripDistance)}</Text>
              <Text style={styles.metaText}>ETA: {formatEta(etaToPickup)}</Text>
            </View>
            {activeTrip && (
              <View style={styles.detailsBox}>
                <Text style={styles.detailLine}>
                  👥 {activeTrip.passengerCount} pasajero{activeTrip.passengerCount !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.detailLine}>📝 {activeTrip.description}</Text>
                {activeTrip.photoUris?.length ? (
                  <Text style={styles.detailLine}>📷 {activeTrip.photoUris.length} foto(s) adjunta(s)</Text>
                ) : null}
                {activeTrip.serviceType ? (
                  <Text style={styles.detailLine}>
                    Servicio: {SERVICE_TYPE_LABELS[activeTrip.serviceType]}
                  </Text>
                ) : null}
                {activeTrip.requestType ? (
                  <Text style={styles.detailLine}>
                    Tipo: {REQUEST_TYPE_LABELS[activeTrip.requestType]}
                  </Text>
                ) : null}
                {activeTrip.cargoDetails ? (
                  <View style={styles.cargoBox}>
                    <Text style={styles.cargoTitle}>Detalles de carga</Text>
                    {activeTrip.cargoDetails.weightKg != null && (
                      <Text style={styles.detailLine}>Peso: {activeTrip.cargoDetails.weightKg} kg</Text>
                    )}
                    {activeTrip.cargoDetails.itemCount != null && (
                      <Text style={styles.detailLine}>Ítems: {activeTrip.cargoDetails.itemCount}</Text>
                    )}
                    {activeTrip.cargoDetails.dimensions ? (
                      <Text style={styles.detailLine}>Dimensiones: {activeTrip.cargoDetails.dimensions}</Text>
                    ) : null}
                    {activeTrip.cargoDetails.requiresLoadingHelp ? (
                      <Text style={styles.detailLine}>Requiere ayuda de carga</Text>
                    ) : null}
                    {activeTrip.cargoDetails.fragile ? (
                      <Text style={styles.detailLine}>Carga frágil</Text>
                    ) : null}
                    {activeTrip.cargoDetails.notes ? (
                      <Text style={styles.detailLine}>{activeTrip.cargoDetails.notes}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )}
            <PriceStepper
              value={offerPrice}
              tripType={activeTrip?.tripType ?? tripType}
              onChange={setOfferPrice}
            />
            <View style={styles.actionRow}>
              <PrimaryButton title="Rechazar" onPress={() => setShowRequest(false)} variant="outline" style={styles.rejectBtn} />
              <PrimaryButton title="Enviar oferta" onPress={handleSubmitOffer} style={styles.acceptBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm,
  },
  menuBtn: {
    width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surface,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.label, color: colors.text },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  hotspotsSection: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  hotspotsTitle: { ...typography.bodyMedium, color: colors.text },
  hotspotsHint: { ...typography.caption, color: colors.textSecondary },
  hotspotsCount: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  listsSection: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  listsTitle: { ...typography.bodyMedium, color: colors.text },
  listsLine: { ...typography.caption, color: colors.textSecondary },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  unitText: { ...typography.caption, color: colors.textSecondary },
  subLine: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  warning: { ...typography.caption, color: colors.warning, marginBottom: spacing.sm },
  requestStatusBox: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  requestStatusText: { ...typography.bodyMedium, color: colors.text },
  requestStatusMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  earningsLabel: { ...typography.caption, color: colors.textSecondary },
  earningsValue: { ...typography.price, color: colors.text, marginTop: 4 },
  tripsCount: { ...typography.caption, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  sessionInfo: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  toggleBtn: { marginTop: spacing.sm },
  assignedBtn: { marginTop: spacing.md },
  cancelBtn: { marginTop: spacing.sm },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  requestCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md,
  },
  requestTitle: { ...typography.subtitle, color: colors.text },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  passengerInfo: { flex: 1 },
  passengerName: { ...typography.bodyMedium, color: colors.text },
  tripTypeLabel: { ...typography.caption, color: colors.textSecondary },
  routeCard: { backgroundColor: colors.borderLight, borderRadius: radius.md, padding: spacing.md },
  routeValue: { ...typography.bodyMedium, color: colors.text },
  routeLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: spacing.lg },
  metaText: { ...typography.caption, color: colors.textSecondary },
  detailsBox: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  detailLine: { ...typography.caption, color: colors.text },
  cargoBox: { marginTop: spacing.xs, gap: 2 },
  cargoTitle: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  rejectBtn: { flex: 1 },
  acceptBtn: { flex: 2 },
});
