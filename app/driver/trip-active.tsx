import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MapScreen,
  BottomCard,
  PrimaryButton,
  DriverAvatar,
  VehicleBadge,
} from '../../src/components';
import { HelpButton } from '../../src/components/HelpButton';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import { SafeBackFallback } from '../../src/components/SafeBackFallback';
import { useTrip } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { getDriverByUserId, getVehicle } from '../../src/services/profileData';
import { buildRouteFromPlaces, buildTripMarkers } from '../../src/utils/mapHelpers';
import { formatEta, calculateEtaMinutes } from '../../src/utils/geo';
import { formatPrice } from '../../src/utils/pricing';
import { openWazeNavigation, openGoogleMapsNavigation } from '../../src/utils/waze';
import {
  getDriverTripPhase,
  DRIVER_STATUS_LABELS,
  DRIVER_BANNER_LABELS,
} from '../../src/utils/driverTripFlow';
import { advanceTripOnBackend } from '../../src/services/api';
import { showSuccess } from '../../src/utils/feedback';
import { getMeetingShareForDriver } from '../../src/services/meetingService';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function DriverTripActiveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { handleBack, showFallback, goHome } = useSafeBack();
  const {
    activeTrip,
    origin,
    destination,
    advanceTripLifecycle,
    completeTrip,
    getDriverEtaToPickup,
  } = useTrip();

  const driverRecord = user ? getDriverByUserId(user.userId) : undefined;
  const vehicle = driverRecord ? getVehicle(driverRecord.vehicleId) : undefined;
  const isMyTrip =
    !!activeTrip?.acceptedOffer &&
    !!driverRecord &&
    activeTrip.acceptedOffer.driverId === driverRecord.id;

  useEffect(() => {
    if (!activeTrip?.acceptedOffer || !destination || !isMyTrip) {
      router.replace('/driver');
    }
  }, [activeTrip, destination, isMyTrip, router]);

  if (!activeTrip?.acceptedOffer || !destination || !isMyTrip) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No hay viaje activo asignado</Text>
        <PrimaryButton title="Volver al inicio" onPress={() => router.replace('/driver')} />
      </View>
    );
  }

  const phase = getDriverTripPhase(activeTrip.lifecycleStatus);
  const { price, etaMinutes } = activeTrip.acceptedOffer;
  const pickupEta = getDriverEtaToPickup(user?.userId);
  const tripEta = calculateEtaMinutes(activeTrip.distanceKm);
  const displayEta = phase === 'in_progress' ? tripEta : pickupEta || etaMinutes;
  const meeting =
    driverRecord && activeTrip
      ? getMeetingShareForDriver(activeTrip.id, driverRecord.id)
      : null;

  const handleWazePickup = async () => {
    if (activeTrip.lifecycleStatus === 'accepted') {
      advanceTripLifecycle('driver_arriving');
    }
    await openWazeNavigation(activeTrip.origin.coordinates);
  };

  const handleWazeDestination = async () => {
    await openWazeNavigation(activeTrip.destination.coordinates);
  };

  const handleGooglePickup = async () => {
    if (activeTrip.lifecycleStatus === 'accepted') {
      advanceTripLifecycle('driver_arriving');
    }
    await openGoogleMapsNavigation(activeTrip.origin.coordinates);
  };

  const handleGoogleDestination = async () => {
    await openGoogleMapsNavigation(activeTrip.destination.coordinates);
  };

  const handleArrived = () => {
    advanceTripLifecycle('driver_arrived');
    showSuccess('Llegaste al punto', 'Confirma cuando el pasajero esté listo para iniciar.');
  };

  const handleStartTrip = () => {
    advanceTripLifecycle('trip_started');
    showSuccess('Viaje iniciado', 'Lleva al pasajero al destino. Usa Waze si lo necesitas.');
  };

  const handleCompleteTrip = () => {
    Alert.alert('Finalizar viaje', '¿Confirmas que el viaje terminó?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, finalizar',
        onPress: async () => {
          await advanceTripOnBackend(activeTrip.id, 'trip_completed');
          completeTrip();
          showSuccess('Viaje completado', `Cobraste ${formatPrice(price)}. ¡Buen trabajo!`);
          router.replace('/driver/rating');
        },
      },
    ]);
  };

  const renderActions = () => {
    if (phase === 'pickup') {
      return (
        <>
          <PrimaryButton
            title="Abrir Waze hacia pasajero"
            onPress={handleWazePickup}
            style={styles.primaryAction}
          />
          <PrimaryButton
            title="Google Maps hacia pasajero"
            onPress={handleGooglePickup}
            variant="secondary"
            style={styles.secondaryAction}
          />
          <PrimaryButton
            title="Llegué"
            onPress={handleArrived}
            variant="outline"
            style={styles.secondaryAction}
          />
        </>
      );
    }

    if (phase === 'arrived') {
      return (
        <PrimaryButton
          title="Iniciar viaje"
          onPress={handleStartTrip}
          style={styles.primaryAction}
        />
      );
    }

    if (phase === 'in_progress') {
      return (
        <>
          <PrimaryButton
            title="Abrir Waze hacia destino"
            onPress={handleWazeDestination}
            style={styles.primaryAction}
          />
          <PrimaryButton
            title="Google Maps hacia destino"
            onPress={handleGoogleDestination}
            variant="secondary"
            style={styles.secondaryAction}
          />
          <PrimaryButton
            title="Finalizar viaje"
            onPress={handleCompleteTrip}
            variant="outline"
            style={styles.secondaryAction}
          />
        </>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <MapScreen
        showRoute
        showDestination={phase === 'in_progress'}
        markers={buildTripMarkers(origin, destination, true)}
        route={buildRouteFromPlaces(origin, destination)}
      />

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <HelpButton compact />
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.push(`/chat/${activeTrip.id}` as never)}
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        {showFallback ? <SafeBackFallback onGoHome={goHome} /> : null}
      </SafeAreaView>

      <View style={styles.navBanner}>
        <Ionicons
          name={phase === 'in_progress' ? 'flag' : 'navigate'}
          size={18}
          color={colors.primaryText}
        />
        <Text style={styles.navText}>{DRIVER_BANNER_LABELS[phase]}</Text>
      </View>

      <View style={styles.bottomArea}>
        <BottomCard expanded>
          <Text style={styles.screenTitle}>{DRIVER_STATUS_LABELS[phase]}</Text>

          <View style={styles.passengerRow}>
            <DriverAvatar name={activeTrip.passengerName} size={52} />
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerName}>{activeTrip.passengerName}</Text>
              <Text style={styles.passengerLabel}>Pasajero</Text>
            </View>
          </View>

          <View style={styles.routeBlock}>
            <View style={styles.routeRow}>
              <Ionicons name="radio-button-on" size={14} color={colors.primary} />
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>Punto de recogida</Text>
                <Text style={styles.routeValue}>{activeTrip.origin.name}</Text>
              </View>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeRow}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeValue}>{activeTrip.destination.name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Precio</Text>
              <Text style={styles.statValue}>{formatPrice(price)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>ETA</Text>
              <Text style={styles.statValue}>{formatEta(displayEta)}</Text>
            </View>
            {vehicle && (
              <>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Unidad</Text>
                  <Text style={styles.statValue}>#{vehicle.unitNumber}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Placa</Text>
                  <Text style={styles.statValue}>{vehicle.plateNumber}</Text>
                </View>
              </>
            )}
          </View>

          {vehicle && (
            <View style={styles.unitRow}>
              <VehicleBadge type={vehicle.vehicleType} compact />
              <Text style={styles.unitText}>
                Unidad #{vehicle.unitNumber} · {vehicle.plateNumber} · {vehicle.associationName}
              </Text>
            </View>
          )}

          {meeting && (meeting.description || meeting.photoUri || meeting.liveLocation) && (
            <View style={styles.meetingBox}>
              <Text style={styles.meetingTitle}>Facilitar encuentro (pasajero)</Text>
              {meeting.description ? (
                <Text style={styles.meetingLine}>📝 {meeting.description}</Text>
              ) : null}
              {meeting.photoUri ? (
                <Text style={styles.meetingLine}>📷 Foto temporal compartida</Text>
              ) : null}
              {meeting.liveLocation ? (
                <Text style={styles.meetingLine}>📍 Ubicación en vivo activa</Text>
              ) : null}
            </View>
          )}

          {renderActions()}
        </BottomCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  fallbackText: { ...typography.body, color: colors.text },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  navBanner: {
    position: 'absolute',
    top: 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 5,
  },
  navText: { ...typography.bodyMedium, color: colors.primaryText },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  screenTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.md,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  passengerInfo: { flex: 1 },
  passengerName: { ...typography.subtitle, color: colors.text },
  passengerLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  routeBlock: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  routeTexts: { flex: 1 },
  routeLabel: { ...typography.caption, color: colors.textMuted },
  routeValue: { ...typography.bodyMedium, color: colors.text, marginTop: 2 },
  routeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
    marginLeft: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: {
    width: '47%',
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  statLabel: { ...typography.caption, color: colors.textMuted },
  statValue: { ...typography.bodyMedium, color: colors.text, marginTop: 4 },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  unitText: { ...typography.caption, color: colors.textSecondary },
  primaryAction: { marginTop: spacing.sm },
  secondaryAction: { marginTop: spacing.md },
  meetingBox: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  meetingTitle: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  meetingLine: { ...typography.body, color: colors.text },
});
