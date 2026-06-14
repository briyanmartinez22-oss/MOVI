import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapScreen, BottomCard, PrimaryButton } from '../../src/components';
import { useTrip } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { getDriverByUserId } from '../../src/services/profileData';
import { buildRouteFromPlaces, buildTripMarkers } from '../../src/utils/mapHelpers';
import { openWazeNavigation, openGoogleMapsNavigation } from '../../src/utils/waze';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function NavigatePassengerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeTrip, origin, destination, advanceTripLifecycle } = useTrip();

  const driverRecord = user ? getDriverByUserId(user.userId) : undefined;
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
        <Text style={styles.fallbackText}>No hay viaje activo</Text>
        <PrimaryButton title="Volver" onPress={() => router.replace('/driver')} />
      </View>
    );
  }

  const coords = activeTrip.origin.coordinates;

  const handleWaze = async () => {
    if (activeTrip.lifecycleStatus === 'accepted') {
      advanceTripLifecycle('driver_arriving');
    }
    await openWazeNavigation(coords);
  };

  const handleGoogleMaps = async () => {
    if (activeTrip.lifecycleStatus === 'accepted') {
      advanceTripLifecycle('driver_arriving');
    }
    await openGoogleMapsNavigation(coords);
  };

  return (
    <View style={styles.container}>
      <MapScreen
        showRoute
        markers={buildTripMarkers(origin, destination, false)}
        route={buildRouteFromPlaces(origin, destination)}
      />

      <SafeAreaView style={styles.banner} edges={['top']}>
        <Ionicons name="navigate" size={18} color={colors.primaryText} />
        <Text style={styles.bannerText}>Navegación al pasajero</Text>
      </SafeAreaView>

      <View style={styles.bottomArea}>
        <BottomCard expanded>
          <Text style={styles.title}>Punto de recogida</Text>
          <Text style={styles.address}>{activeTrip.origin.name}</Text>
          <Text style={styles.hint}>Abre Waze o Google Maps hacia el pasajero.</Text>

          <PrimaryButton
            title="Abrir Waze"
            onPress={handleWaze}
            style={styles.navBtn}
          />
          <PrimaryButton
            title="Abrir Google Maps"
            onPress={handleGoogleMaps}
            variant="secondary"
            style={styles.navBtn}
          />
          <PrimaryButton
            title="Ir al viaje activo"
            onPress={() => router.replace('/driver/trip-active')}
            variant="outline"
            style={styles.navBtn}
          />
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
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  fallbackText: { ...typography.body, color: colors.text },
  banner: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  bannerText: { ...typography.bodyMedium, color: colors.primaryText },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  address: { ...typography.body, color: colors.text },
  hint: { ...typography.caption, color: colors.textSecondary, marginVertical: spacing.md },
  navBtn: { marginTop: spacing.sm },
});
