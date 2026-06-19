import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MapScreen,
  BottomCard,
  PrimaryButton,
  ServiceCategorySelector,
  VehicleBadge,
} from '../../src/components';
import { FormInput } from '../../src/components/FormUI';
import { HelpButton } from '../../src/components/HelpButton';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import { SafeBackFallback } from '../../src/components/SafeBackFallback';
import { useTrip } from '../../src/context/TripContext';
import { getPrimaryVehicleType, getServiceCategory } from '../../src/data/serviceCategories';
import { canShowScheduleOption } from '../../src/utils/tripScheduling';
import { buildRouteFromPlaces, buildTripMarkers } from '../../src/utils/mapHelpers';
import { formatDistance } from '../../src/utils/geo';
import { colors, typography, spacing, radius } from '../../src/theme';

const PASSENGER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function EstimateScreen() {
  const router = useRouter();
  const { handleBack, showFallback, goHome } = useSafeBack();
  const {
    origin,
    destination,
    tripType,
    setTripType,
    serviceCategoryId,
    setServiceCategoryId,
    passengerCount,
    setPassengerCount,
    tripDescription,
    setTripDescription,
    tripPhotoUris,
    addTripPhoto,
    removeTripPhoto,
    requestTrip,
    getTripDistanceKm,
    requestMode,
    setRequestMode,
    scheduledAt,
    setScheduledAt,
    scheduledNotes,
    setScheduledNotes,
  } = useTrip();
  const [isPlusTen, setIsPlusTen] = useState(passengerCount > 10);

  if (!destination) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Selecciona un destino primero</Text>
        <PrimaryButton title="Volver al inicio" onPress={() => router.replace('/passenger')} />
      </View>
    );
  }

  const distanceKm = getTripDistanceKm();
  const category = getServiceCategory(serviceCategoryId);
  const requiredVehicleType = getPrimaryVehicleType(serviceCategoryId);
  const showScheduleOption = canShowScheduleOption(requiredVehicleType);
  const markers = buildTripMarkers(origin, destination, true);
  const route = buildRouteFromPlaces(origin, destination);

  const handlePassengerSelect = (count: number) => {
    setIsPlusTen(false);
    setPassengerCount(count);
  };

  const handlePlusTen = () => {
    setIsPlusTen(true);
    setPassengerCount(11);
  };

  const handleAddPhoto = () => {
    if (tripPhotoUris.length >= 3) {
      Alert.alert('Límite alcanzado', 'Puedes adjuntar hasta 3 fotos.');
      return;
    }
    addTripPhoto(`mock://trip-photo-${Date.now()}`);
  };

  const handleRequest = () => {
    const description = [tripDescription.trim(), scheduledNotes.trim()].filter(Boolean).join(' · ');
    if (!description) {
      Alert.alert('Descripción requerida', 'Describe tu viaje para que el conductor sepa qué esperar.');
      return;
    }
    if (requestMode === 'SCHEDULED') {
      if (!scheduledAt || scheduledAt <= new Date()) {
        Alert.alert('Fecha inválida', 'Selecciona una fecha y hora futura para programar.');
        return;
      }
    }
    requestTrip(undefined, undefined, {
      description,
      requestMode,
      scheduledAt: scheduledAt?.getTime(),
    });
    router.push('/passenger/matching');
  };

  return (
    <View style={styles.container}>
      <MapScreen
        showRoute
        showDestination
        markers={markers}
        route={route}
      />

      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <HelpButton compact />
        {showFallback ? <SafeBackFallback onGoHome={goHome} /> : null}
      </SafeAreaView>

      <View style={styles.bottomArea}>
        <BottomCard expanded>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <VehicleBadge type={getPrimaryVehicleType(serviceCategoryId)} />

            <View style={styles.routeInfo}>
              <View style={styles.routeRow}>
                <View style={styles.routeDots}>
                  <View style={styles.dotStart} />
                  <View style={styles.routeLine} />
                  <View style={styles.dotEnd} />
                </View>
                <View style={styles.routeTexts}>
                  <Text style={styles.routeOrigin}>{origin.name}</Text>
                  <Text style={styles.routeDest}>{destination.name}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="navigate-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.statValue}>{formatDistance(distanceKm)}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Pasajeros *</Text>
            <View style={styles.passengerRow}>
              {PASSENGER_OPTIONS.map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.passengerChip,
                    !isPlusTen && passengerCount === count && styles.passengerChipActive,
                  ]}
                  onPress={() => handlePassengerSelect(count)}
                >
                  <Text
                    style={[
                      styles.passengerChipText,
                      !isPlusTen && passengerCount === count && styles.passengerChipTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.passengerChip, isPlusTen && styles.passengerChipActive]}
                onPress={handlePlusTen}
              >
                <Text style={[styles.passengerChipText, isPlusTen && styles.passengerChipTextActive]}>
                  10+
                </Text>
              </TouchableOpacity>
            </View>

            <FormInput
              label="Descripción del viaje *"
              value={tripDescription}
              onChangeText={setTripDescription}
              placeholder="Ej: Viaje con equipaje ligero, recoger en portón azul..."
              multiline
              hint="Obligatorio — ayuda al conductor a prepararse"
            />

            <Text style={styles.sectionLabel}>Fotos (opcional)</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleAddPhoto}>
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                <Text style={styles.photoBtnText}>Agregar foto</Text>
              </TouchableOpacity>
              {tripPhotoUris.map((uri) => (
                <View key={uri} style={styles.photoTag}>
                  <Text style={styles.photoTagText}>📷 Foto</Text>
                  <TouchableOpacity onPress={() => removeTripPhoto(uri)}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <ServiceCategorySelector
              categoryId={serviceCategoryId}
              tripType={tripType}
              onCategoryChange={setServiceCategoryId}
              onTripTypeChange={setTripType}
            />

            {showScheduleOption ? (
              <>
                <Text style={styles.sectionLabel}>Cuándo</Text>
                <View style={styles.passengerRow}>
                  <TouchableOpacity
                    style={[styles.passengerChip, requestMode === 'NOW' && styles.passengerChipActive]}
                    onPress={() => setRequestMode('NOW')}
                  >
                    <Text style={[styles.passengerChipText, requestMode === 'NOW' && styles.passengerChipTextActive]}>
                      Ahora
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.passengerChip, requestMode === 'SCHEDULED' && styles.passengerChipActive]}
                    onPress={() => setRequestMode('SCHEDULED')}
                  >
                    <Text
                      style={[
                        styles.passengerChipText,
                        requestMode === 'SCHEDULED' && styles.passengerChipTextActive,
                      ]}
                    >
                      Programar
                    </Text>
                  </TouchableOpacity>
                </View>
                {requestMode === 'SCHEDULED' ? (
                  <>
                    <FormInput
                      label="Fecha y hora (ISO)"
                      value={scheduledAt ? scheduledAt.toISOString().slice(0, 16) : ''}
                      onChangeText={(value) => {
                        const parsed = new Date(value);
                        setScheduledAt(Number.isNaN(parsed.getTime()) ? null : parsed);
                      }}
                      placeholder="2026-06-20T09:00"
                      hint="Formato: YYYY-MM-DDTHH:mm"
                    />
                    <FormInput
                      label="Notas del viaje / carga"
                      value={scheduledNotes}
                      onChangeText={setScheduledNotes}
                      placeholder="Ej: 15 pasajeros, equipaje, punto de encuentro..."
                      multiline
                    />
                  </>
                ) : null}
              </>
            ) : null}

            <Text style={styles.note}>
              Los conductores enviarán sus ofertas. Tú eliges cuál aceptar.
            </Text>

            <PrimaryButton
              title={category.requestButtonLabel}
              onPress={handleRequest}
              style={styles.confirmBtn}
            />
          </ScrollView>
        </BottomCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '72%',
  },
  routeInfo: {
    marginVertical: spacing.lg,
  },
  routeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  routeDots: {
    alignItems: 'center',
    paddingTop: 4,
  },
  dotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  routeLine: {
    width: 2,
    height: 28,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  dotEnd: {
    width: 10,
    height: 10,
    backgroundColor: colors.primary,
  },
  routeTexts: {
    flex: 1,
    gap: spacing.lg,
  },
  routeOrigin: {
    ...typography.body,
    color: colors.textSecondary,
  },
  routeDest: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  passengerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  passengerChip: {
    minWidth: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
  },
  passengerChipActive: {
    backgroundColor: colors.primary,
  },
  passengerChipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  passengerChipTextActive: {
    color: colors.primaryText,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoBtnText: {
    ...typography.caption,
    color: colors.primary,
  },
  photoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  photoTagText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  confirmBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
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
    textAlign: 'center',
  },
});
