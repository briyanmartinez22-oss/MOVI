import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MapScreen,
  OfferCard,
  PrimaryButton,
  MeetingFacilitation,
  PriceStepper,
} from '../../src/components';
import { HelpButton } from '../../src/components/HelpButton';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import { SafeBackFallback } from '../../src/components/SafeBackFallback';
import { showSuccess } from '../../src/utils/feedback';
import { useTrip } from '../../src/context/TripContext';
import { buildRouteFromPlaces, buildTripMarkers } from '../../src/utils/mapHelpers';
import { sortOffers } from '../../src/utils/platform';
import { getMinPriceForTrip } from '../../src/utils/pricing';
import { getCategoryModeLabel } from '../../src/data/serviceCategories';
import { colors, typography, spacing } from '../../src/theme';

export default function OffersScreen() {
  const router = useRouter();
  const { handleBack, showFallback, goHome } = useSafeBack();
  const { activeTrip, origin, destination, acceptOffer, updatePassengerOfferPrice } = useTrip();
  const [offerAccepted, setOfferAccepted] = useState(false);

  useEffect(() => {
    if (!activeTrip || !destination) {
      const timer = setTimeout(() => router.replace('/passenger'), 100);
      return () => clearTimeout(timer);
    }
    if (activeTrip.acceptedOffer) {
      setOfferAccepted(true);
    }
  }, [activeTrip, destination, router]);

  if (!activeTrip || !destination) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No hay ofertas activas</Text>
        <PrimaryButton title="Volver al inicio" onPress={() => router.replace('/passenger')} />
      </View>
    );
  }

  const sortedOffers = sortOffers(
    activeTrip.offers.filter((offer) => offer.status === 'pending')
  );
  const accepted = activeTrip.acceptedOffer;
  const categoryLabel = getCategoryModeLabel(
    activeTrip.serviceCategoryId ?? 'mototaxi',
    activeTrip.tripType
  );

  const handleAccept = (offerId: string) => {
    acceptOffer(offerId);
    setOfferAccepted(true);
    showSuccess('Oferta aceptada', 'Facilita el encuentro con tu conductor antes de seguir.');
  };

  const goToDriverScreen = () => {
    router.replace('/passenger/driver');
  };

  return (
    <View style={styles.container}>
      <MapScreen
        showRoute
        showDestination
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

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.panel}>
          {offerAccepted && accepted ? (
            <>
              <Text style={styles.title}>Conductor asignado</Text>
              <Text style={styles.subtitle}>
                {accepted.driver.name} · Unidad {accepted.driver.unit}
              </Text>
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
              >
                <MeetingFacilitation tripId={activeTrip.id} driverId={accepted.driver.id} />
              </ScrollView>
              <PrimaryButton
                title="Ver conductor en el mapa"
                onPress={goToDriverScreen}
                style={styles.continueBtn}
              />
            </>
          ) : (
            <>
              <Text style={styles.title}>Ofertas disponibles</Text>
              <Text style={styles.subtitle}>
                {categoryLabel} · Compara y elige la mejor opción
              </Text>

              <PriceStepper
                value={
                  activeTrip.passengerOfferPrice ??
                  getMinPriceForTrip(activeTrip.tripType, activeTrip.serviceCategoryId)
                }
                tripType={activeTrip.tripType}
                categoryId={activeTrip.serviceCategoryId}
                onChange={updatePassengerOfferPrice}
              />

              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
              >
                {sortedOffers.length === 0 ? (
                  <Text style={styles.empty}>Esperando ofertas de conductores cercanos</Text>
                ) : (
                  sortedOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onAccept={() => handleAccept(offer.id)}
                    />
                  ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      </SafeAreaView>
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
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '62%',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { ...typography.subtitle, color: colors.text },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  list: { flexGrow: 0 },
  listContent: { gap: spacing.md, paddingBottom: spacing.lg },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  continueBtn: { marginTop: spacing.md },
});
