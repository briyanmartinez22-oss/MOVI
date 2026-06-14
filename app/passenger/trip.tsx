import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  MapScreen,
  BottomCard,
  DriverProfileCard,
  PrimaryButton,
} from '../../src/components';
import { HelpButton } from '../../src/components/HelpButton';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import { SafeBackFallback } from '../../src/components/SafeBackFallback';
import { showSuccess } from '../../src/utils/feedback';
import { useTrip } from '../../src/context/TripContext';
import { buildRouteFromPlaces, buildTripMarkers } from '../../src/utils/mapHelpers';
import { formatEta } from '../../src/utils/geo';
import { formatPrice } from '../../src/utils/pricing';
import { formatCoordinates } from '../../src/utils/parseCoordinates';
import { colors, typography, spacing, radius } from '../../src/theme';

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Conductor asignado',
  driver_arriving: 'Conductor en camino',
  driver_arrived: 'Conductor llegó',
  trip_started: 'Viaje iniciado',
  trip_completed: 'Viaje completado',
};

export default function TripInProgressScreen() {
  const router = useRouter();
  const { handleBack, showFallback, goHome } = useSafeBack();
  const { activeTrip, origin, destination, cancelTrip, completeTrip, advanceTripLifecycle } =
    useTrip();

  useEffect(() => {
    if (!activeTrip?.acceptedOffer || !destination) {
      router.replace('/passenger');
    }
  }, [activeTrip, destination, router]);

  if (!activeTrip?.acceptedOffer || !destination) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No hay un viaje activo</Text>
        <PrimaryButton title="Volver al inicio" onPress={() => router.replace('/passenger')} />
      </View>
    );
  }

  const { driver, price, etaMinutes } = activeTrip.acceptedOffer;
  const statusLabel =
    STATUS_LABELS[activeTrip.lifecycleStatus] ?? 'Viaje activo';

  const handleCancel = () => {
    Alert.alert('Cancelar viaje', '¿Deseas cancelar este viaje?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: () => {
          cancelTrip('passenger');
          router.replace('/passenger');
        },
      },
    ]);
  };

  const handleAdvance = () => {
    const flow: Array<typeof activeTrip.lifecycleStatus> = [
      'accepted',
      'driver_arriving',
      'driver_arrived',
      'trip_started',
      'trip_completed',
    ];
    const idx = flow.indexOf(activeTrip.lifecycleStatus);
    const next = flow[idx + 1];
    if (!next) return;
    if (next === 'trip_completed') {
      completeTrip();
      showSuccess('Viaje completado', 'Califica tu experiencia con el conductor.');
      router.push('/passenger/rating');
    } else {
      advanceTripLifecycle(next);
    }
  };

  return (
    <View style={styles.container}>
      <MapScreen
        showRoute
        showDestination
        markers={buildTripMarkers(origin, destination, true)}
        route={buildRouteFromPlaces(origin, destination)}
      />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <HelpButton compact />
        {showFallback ? <SafeBackFallback onGoHome={goHome} /> : null}
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{statusLabel}</Text>
        <Text style={styles.statusEta}>Llegada en {formatEta(etaMinutes)}</Text>
        <Text style={styles.statusPrice}>{formatPrice(price)}</Text>
      </View>

      <View style={styles.bottomArea}>
        <BottomCard expanded>
          <DriverProfileCard
            name={driver.name}
            unit={driver.unit}
            plate={driver.plate}
            association={driver.association}
            rating={driver.rating}
            etaMinutes={etaMinutes}
            price={price}
          />

          <View style={styles.routeCard}>
            <Text style={styles.routeLabel}>Origen</Text>
            <Text style={styles.routeValue}>{origin.name}</Text>
            <Text style={styles.coords}>
              {formatCoordinates(origin.coordinates.latitude, origin.coordinates.longitude)}
            </Text>
            <Text style={[styles.routeLabel, { marginTop: spacing.sm }]}>Destino</Text>
            <Text style={styles.routeValue}>{destination.name}</Text>
            <Text style={styles.coords}>
              {formatCoordinates(destination.coordinates.latitude, destination.coordinates.longitude)}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="call" size={22} color={colors.text} />
              <Text style={styles.actionLabel}>Llamar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                router.push({ pathname: '/chat/[tripId]', params: { tripId: activeTrip.id } })
              }
            >
              <Ionicons name="chatbubble" size={22} color={colors.text} />
              <Text style={styles.actionLabel}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCancel}>
              <Ionicons name="close-circle" size={22} color={colors.danger} />
              <Text style={[styles.actionLabel, styles.cancelLabel]}>Cancelar viaje</Text>
            </TouchableOpacity>
          </View>

          <PrimaryButton
            title={
              activeTrip.lifecycleStatus === 'trip_started'
                ? 'Completar viaje'
                : 'Avanzar estado del viaje'
            }
            onPress={handleAdvance}
            variant="secondary"
          />
        </BottomCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  fallbackText: {
    ...typography.body,
    color: colors.text,
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
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
  statusBar: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusEta: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: 2,
  },
  statusPrice: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 4,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  routeCard: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  routeLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  routeValue: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 2,
  },
  coords: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.text,
  },
  cancelLabel: {
    color: colors.danger,
  },
});
