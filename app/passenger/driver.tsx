import { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  MapScreen,
  BottomCard,
  PrimaryButton,
  DriverProfileCard,
  VehicleBadge,
  CancelTripButton,
} from '../../src/components';
import { MeetingFacilitation } from '../../src/components/MeetingFacilitation';
import { useTrip } from '../../src/context/TripContext';
import { getServiceCategory } from '../../src/data/serviceCategories';
import { getDriverById, getVehicle } from '../../src/services/profileData';
import { buildRouteFromPlaces, buildTripMarkers } from '../../src/utils/mapHelpers';
import { formatEta } from '../../src/utils/geo';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function DriverAssignedScreen() {
  const router = useRouter();
  const { activeTrip, origin, destination } = useTrip();

  useEffect(() => {
    if (!activeTrip?.acceptedOffer || !destination) {
      router.replace('/passenger');
    }
  }, [activeTrip, destination, router]);

  if (!activeTrip?.acceptedOffer || !destination) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No hay conductor asignado</Text>
        <PrimaryButton title="Volver" onPress={() => router.replace('/passenger')} />
      </View>
    );
  }

  const { driver, price, etaMinutes } = activeTrip.acceptedOffer;
  const driverRecord = getDriverById(driver.id);
  const vehicle = driverRecord ? getVehicle(driverRecord.vehicleId) : undefined;
  const unitPhoto = vehicle?.documents.unitPhoto ?? vehicle?.documents.fullVehiclePhoto;
  const vehicleSectionLabel = getServiceCategory(activeTrip.serviceCategoryId).vehicleSectionLabel;

  return (
    <View style={styles.container}>
      <MapScreen
        showRoute
        showDestination
        markers={buildTripMarkers(origin, destination, true)}
        route={buildRouteFromPlaces(origin, destination)}
      />

      <View style={styles.etaBanner}>
        <Ionicons name="time" size={16} color={colors.primaryText} />
        <Text style={styles.etaText}>Tu conductor está en camino</Text>
      </View>

      <View style={styles.subBanner}>
        <Text style={styles.subBannerText}>Llegada en {formatEta(etaMinutes)}</Text>
      </View>

      <View style={styles.bottomArea}>
        <BottomCard expanded>
          <Text style={styles.sectionTitle}>{vehicleSectionLabel}</Text>

          {unitPhoto ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: unitPhoto }} style={styles.unitPhoto} />
              <VehicleBadge type={vehicle?.vehicleType} compact />
            </View>
          ) : (
            <VehicleBadge type={vehicle?.vehicleType} />
          )}

          <DriverProfileCard
            name={driver.name}
            unit={driver.unit}
            plate={driver.plate}
            association={driver.association}
            rating={driver.rating}
            etaMinutes={etaMinutes}
            price={price}
          />

          <MeetingFacilitation tripId={activeTrip.id} driverId={driver.id} />

          <PrimaryButton
            title="Ver viaje activo"
            onPress={() => router.push('/passenger/trip')}
            style={styles.actionBtn}
          />
          <CancelTripButton by="passenger" style={styles.cancelBtn} />
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
  },
  fallbackText: { ...typography.body, color: colors.text },
  etaBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    elevation: 4,
  },
  etaText: { ...typography.bodyMedium, color: colors.primaryText },
  subBanner: {
    position: 'absolute',
    top: 108,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  subBannerText: { ...typography.caption, color: colors.textSecondary },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  photoWrap: { marginBottom: spacing.md, alignItems: 'center', gap: spacing.sm },
  unitPhoto: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
  },
  actionBtn: { marginTop: spacing.lg },
  cancelBtn: { marginTop: spacing.md },
});
