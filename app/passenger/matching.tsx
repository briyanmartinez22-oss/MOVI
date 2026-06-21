import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapScreen, BottomCard, PrimaryButton, CancelTripButton } from '../../src/components';
import { HelpButton } from '../../src/components/HelpButton';
import { ContextualHelpLink } from '../../src/components/help/ContextualHelpLink';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import { SafeBackFallback } from '../../src/components/SafeBackFallback';
import { useTrip } from '../../src/context/TripContext';
import { getServiceCategory } from '../../src/data/serviceCategories';
import { buildRouteFromPlaces, buildTripMarkers } from '../../src/utils/mapHelpers';
import { useMockApi } from '../../src/services/api/config';
import { colors, typography, spacing } from '../../src/theme';

const MATCH_TIMEOUT_MS = 60000;

export default function MatchingScreen() {
  const router = useRouter();
  const { handleBack, showFallback, goHome } = useSafeBack();
  const { activeTrip, origin, destination, simulateIncomingOffers } = useTrip();
  const [timedOut, setTimedOut] = useState(false);
  const isMock = useMockApi();

  useEffect(() => {
    if (isMock) {
      const offerTimer = setTimeout(() => {
        simulateIncomingOffers();
      }, 2500);

      const navigateTimer = setTimeout(() => {
        router.replace('/passenger/offers');
      }, 4000);

      const safetyTimer = setTimeout(() => setTimedOut(true), 5000);

      return () => {
        clearTimeout(offerTimer);
        clearTimeout(navigateTimer);
        clearTimeout(safetyTimer);
      };
    }

    const safetyTimer = setTimeout(() => setTimedOut(true), MATCH_TIMEOUT_MS);
    return () => clearTimeout(safetyTimer);
  }, [router, simulateIncomingOffers, isMock]);

  useEffect(() => {
    if (isMock) return;
    if (activeTrip?.offers && activeTrip.offers.length > 0) {
      setTimedOut(false);
      router.replace('/passenger/offers');
    }
  }, [activeTrip?.offers?.length, router, isMock]);

  if (!destination) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Selecciona un destino primero</Text>
        <PrimaryButton title="Volver al inicio" onPress={() => router.replace('/passenger')} />
      </View>
    );
  }

  const matchingLabel = getServiceCategory(activeTrip?.serviceCategoryId).matchingLabel;

  return (
    <View style={styles.container}>
      <MapScreen
        showRoute
        showNearbyDrivers
        markers={buildTripMarkers(origin, destination, true)}
        route={buildRouteFromPlaces(origin, destination)}
      />

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <HelpButton compact />
        {showFallback ? <SafeBackFallback onGoHome={goHome} /> : null}
      </SafeAreaView>

      <View style={styles.bottomArea}>
        <BottomCard>
          <View style={styles.content}>
            {!timedOut ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : null}
            <Text style={styles.title}>
              {timedOut ? 'No fue posible completar la acción.' : 'Buscando conductores cercanos'}
            </Text>
            <Text style={styles.subtitle}>
              {timedOut
                ? 'Revisa tu conexión o intenta de nuevo.'
                : `Esperando ofertas de ${matchingLabel}...`}
            </Text>
            {activeTrip && !timedOut && (
              <Text style={styles.count}>
                {activeTrip.offers.length > 0
                  ? `${activeTrip.offers.length} oferta(s) recibida(s)`
                  : 'Conectando con conductores...'}
              </Text>
            )}
            {timedOut ? (
              <PrimaryButton
                title="Intentar nuevamente"
                onPress={() => {
                  setTimedOut(false);
                  if (isMock) {
                    simulateIncomingOffers();
                    router.replace('/passenger/offers');
                  }
                }}
                style={{ marginTop: spacing.md }}
              />
            ) : null}
          </View>
          <CancelTripButton by="passenger" style={styles.cancelBtn} />
          <ContextualHelpLink sectionId="trips-guide" />
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
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
  cancelBtn: { marginTop: spacing.md },
});
