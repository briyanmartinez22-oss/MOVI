import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MapScreen,
  BottomCard,
  PrimaryButton,
  VehicleBadge,
  DemandHeatmapLegend,
  CancelTripButton,
} from '../../src/components';
import { HotspotFilterBar } from '../../src/components/HotspotFilterBar';
import { useTrip } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { getMinPrice } from '../../src/utils/pricing';
import { fetchDemandZones } from '../../src/services/mockApi';
import { DemandZone } from '../../src/types/models';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
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
  formatSubscriptionStatus,
} from '../../src/services/subscriptionService';
import {
  enrichDemandZones,
  filterDemandZones,
  HotspotFilterState,
} from '../../src/utils/hotspotFilters';
import { useMockApi } from '../../src/services/api/config';
import { fetchScheduledTrips } from '../../src/services/api';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function DriverHome() {
  const router = useRouter();
  const { user, getDailySessionSummary } = useAuth();
  const { loading: profileLoading } = useProfileBootstrap();
  const {
    activeTrip,
    isDriverOnline,
    driverRequestStatus,
    connectDriver,
    disconnectDriver,
    refreshDriverSession,
  } = useTrip();

  const [offerPrice, setOfferPrice] = useState(getMinPrice('shared'));
  const [loading, setLoading] = useState(false);
  const [hotspotFilters, setHotspotFilters] = useState<HotspotFilterState>({ service: 'all', vehicleType: 'all' });
  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const notifiedTripIdRef = useRef<string | null>(null);

  const driverRecord = user ? getDriverByUserId(user.userId) : undefined;
  const vehicle = driverRecord ? getVehicle(driverRecord.vehicleId) : undefined;
  const owner = driverRecord ? getOwnerById(driverRecord.ownerId) : undefined;
  const subscription = driverRecord ? getDriverSubscription(driverRecord.id) : undefined;
  const subGuard = canDriverOperateSubscription(subscription);
  const operation = canOperate(owner, vehicle, driverRecord, !subGuard.allowed, subGuard.reason);
  const summary = driverRecord ? getDailySessionSummary(driverRecord.id) : null;

  useEffect(() => { void fetchDemandZones().then(setDemandZones); }, []);
  useEffect(() => {
    if (driverRecord) refreshDriverSession(driverRecord.id);
  }, [driverRecord, refreshDriverSession]);

  useEffect(() => {
    if (!isDriverOnline || useMockApi()) return;
    const load = () => {
      void fetchScheduledTrips().then((res) => {
        if (res.ok) setScheduledCount(res.data?.length ?? 0);
      });
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [isDriverOnline]);

  useEffect(() => {
    if (!activeTrip || activeTrip.status !== 'accepted') return;
    const isMe = activeTrip.acceptedOffer?.driverId === driverRecord?.id;
    if (!isMe || notifiedTripIdRef.current === activeTrip.id) return;
    notifiedTripIdRef.current = activeTrip.id;
    Alert.alert(
      '¡Viaje aceptado!',
      `${activeTrip.passengerName} aceptó tu oferta. Dirígete al punto de recogida.`,
      [
        { text: 'Ver viaje', onPress: () => router.push('/driver/trip-active') },
        { text: 'Después', style: 'cancel' },
      ]
    );
    router.push('/driver/trip-active');
  }, [activeTrip?.id, activeTrip?.status, driverRecord?.id, router, activeTrip]);

  const handleToggle = async () => {
    if (!driverRecord || !vehicle) {
      Alert.alert('Error', 'Perfil de conductor no encontrado');
      return;
    }
    if (!operation.allowed && !isDriverOnline) {
      Alert.alert('No disponible', operation.reason ?? 'No puedes operar en este momento');
      return;
    }
    setLoading(true);
    if (isDriverOnline) {
      const res = await disconnectDriver(driverRecord.id);
      setLoading(false);
      if (!res.ok) Alert.alert('Error', res.message);
    } else {
      const res = await connectDriver(driverRecord.id, vehicle.vehicleId);
      setLoading(false);
      if (!res.ok) Alert.alert('Error', res.message);
    }
    refreshDriverSession(driverRecord.id);
  };

  const filteredZones = filterDemandZones(enrichDemandZones(demandZones), hotspotFilters);

  if (profileLoading) return <BrandedLoadingView message="Cargando perfil…" />;

  // ESTADO A — Pendiente de aprobación
  if (driverRecord && (driverRecord.status === 'pending' || driverRecord.status === 'in_review')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pendingScreen}>
          <View style={styles.pendingIconWrap}>
            <Ionicons name="time-outline" size={56} color={colors.warning} />
          </View>
          <Text style={styles.pendingTitle}>Verificando tu perfil</Text>
          <Text style={styles.pendingDesc}>
            El equipo de MOVI está revisando tus documentos. Te notificaremos cuando estés aprobado.
          </Text>
          {vehicle && (
            <View style={styles.vehiclePreview}>
              <VehicleBadge type={vehicle.vehicleType} />
              <Text style={styles.vehicleText}>
                {vehicle.brand ?? ''} {vehicle.model ?? ''} · Dueño: {owner?.name ?? '—'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notifications' as never)}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            <Text style={styles.notifBtnText}>Ver notificaciones</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ESTADO B — Sin perfil / necesita registro
  if (!driverRecord) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pendingScreen}>
          <Ionicons name="car-outline" size={56} color={colors.textMuted} />
          <Text style={styles.pendingTitle}>Completa tu registro</Text>
          <Text style={styles.pendingDesc}>Ingresa tu código de invitación para continuar.</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/auth/register-driver-code' as never)}
          >
            <Text style={styles.emptyBtnText}>Ingresar código de invitación</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ESTADOS C/D — Aprobado: Desconectado u Online con mapa
  return (
    <View style={styles.mapContainer}>
      <MapScreen showNearbyDrivers showDemandHeatmap demandZones={filteredZones} />

      <SafeAreaView style={styles.floatingHeader} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/notifications' as never)}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/driver/history' as never)}>
            <Ionicons name="time-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/driver/subscription' as never)}>
            <Ionicons name="card-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: isDriverOnline ? colors.online : colors.offline }]} />
            <Text style={styles.statusPillText}>{isDriverOnline ? 'En línea' : 'Desconectado'}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottomArea}>
        <BottomCard>
          <View style={styles.todayRow}>
            <View style={styles.todayStat}>
              <Text style={styles.todayValue}>${(summary?.totalCashCollected ?? 0).toFixed(2)}</Text>
              <Text style={styles.todayLabel}>Hoy</Text>
            </View>
            <View style={styles.todayStat}>
              <Text style={styles.todayValue}>{summary?.totalTrips ?? 0}</Text>
              <Text style={styles.todayLabel}>Viajes</Text>
            </View>
            <View style={styles.todayStat}>
              <Text style={styles.todayValue}>{summary?.connectionCount ?? 0}</Text>
              <Text style={styles.todayLabel}>Sesiones</Text>
            </View>
          </View>

          {subscription && (
            <Text style={styles.subStatus}>
              Suscripción: {formatSubscriptionStatus(subscription)}
            </Text>
          )}

          {isDriverOnline && (
            <View style={styles.hotspotSection}>
              <Text style={styles.hotspotTitle}>Zonas con más solicitudes</Text>
              <HotspotFilterBar filters={hotspotFilters} onChange={setHotspotFilters} compact />
              <DemandHeatmapLegend compact />
            </View>
          )}

          {isDriverOnline && scheduledCount > 0 && (
            <TouchableOpacity style={styles.scheduledBtn} onPress={() => router.push('/driver/history' as never)}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.scheduledText}>{scheduledCount} viaje{scheduledCount > 1 ? 's' : ''} programado{scheduledCount > 1 ? 's' : ''}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}

          {activeTrip && isDriverOnline && (
            <CancelTripButton style={{ marginBottom: spacing.sm }} />
          )}

          <PrimaryButton
            title={isDriverOnline ? 'Desconectarme' : 'Conectarme a la red'}
            onPress={() => void handleToggle()}
            loading={loading}
            variant={isDriverOnline ? 'outline' : 'primary'}
            style={styles.toggleBtn}
          />

          {!operation.allowed && !isDriverOnline && (
            <Text style={styles.blockedReason}>{operation.reason}</Text>
          )}
        </BottomCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { flex: 1 },
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandWhite,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.brandWhite,
    borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.md,
    marginLeft: 'auto',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  todayRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  todayStat: { alignItems: 'center' },
  todayValue: { ...typography.subtitle, color: colors.text },
  todayLabel: { ...typography.caption, color: colors.textSecondary },
  subStatus: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  hotspotSection: { marginBottom: spacing.md },
  hotspotTitle: { ...typography.label, color: colors.text, marginBottom: spacing.xs },
  scheduledBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.borderLight, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  scheduledText: { ...typography.body, color: colors.primary, flex: 1 },
  toggleBtn: { marginTop: spacing.sm },
  blockedReason: { ...typography.caption, color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
  pendingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  pendingIconWrap: { marginBottom: spacing.sm },
  pendingTitle: { ...typography.subtitle, color: colors.text, textAlign: 'center' },
  pendingDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  vehiclePreview: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', gap: spacing.sm, width: '100%',
  },
  vehicleText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  notifBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
  },
  notifBtnText: { ...typography.body, color: colors.primary },
  emptyBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
  },
  emptyBtnText: { ...typography.bodyMedium, color: colors.brandWhite },
});
