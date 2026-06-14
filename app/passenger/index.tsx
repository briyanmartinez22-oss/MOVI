import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapScreen, BottomCard, MoviLogo } from '../../src/components';
import { HelpButton } from '../../src/components/HelpButton';
import { useTrip } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import { getTripHistory } from '../../src/services/profileData';
import { buildTripMarkers } from '../../src/utils/mapHelpers';
import { salvadorPlaces } from '../../src/data/mock';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { Place } from '../../src/types';
import { colors, typography, spacing, radius } from '../../src/theme';

const HOME_PLACE = salvadorPlaces.find((p) => p.id === 'metrocentro')!;
const WORK_PLACE = salvadorPlaces.find((p) => p.id === 'centro')!;

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function PassengerHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { loading } = useProfileBootstrap();
  const { origin, setDestination, setTripKind } = useTrip();
  const tripCount = user ? getTripHistory({ passengerId: user.userId }).length : 0;
  const greeting = greetingForHour(new Date().getHours());
  const displayName = user?.fullName?.split(' ')[0] ?? 'Pasajero';

  const goToDestination = (preset?: Place) => {
    setTripKind('ride');
    if (preset) setDestination(preset);
    router.push('/passenger/destination');
  };

  return (
    <View style={styles.container}>
      <MapScreen showNearbyDrivers markers={buildTripMarkers(origin, null, true)} />

      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerRow}>
          <View style={styles.headerSide}>
            <TouchableOpacity style={styles.menuBtn} onPress={() => router.replace('/')}>
              <Ionicons name="menu" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <MoviLogo size="sm" />
          </View>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <HelpButton compact />
            <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/activity')}>
              <Ionicons name="pulse-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottomArea}>
        <BottomCard>
          <Text style={styles.greeting}>
            {loading ? greeting : `${greeting}, ${displayName}`}
          </Text>
          {tripCount > 0 ? (
            <Text style={styles.tripStat}>{tripCount} viaje(s) completados</Text>
          ) : null}
          <TouchableOpacity
            style={styles.destinationBtn}
            onPress={() => goToDestination()}
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <Text style={styles.destinationText}>¿A dónde vas?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deliveryBtn}
            onPress={() => {
              setTripKind('personal_delivery');
              router.push('/passenger/destination');
            }}
          >
            <Ionicons name="cube-outline" size={18} color={colors.primary} />
            <Text style={styles.deliveryText}>Entrega personal</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{FIELD_HINTS.destination}</Text>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => goToDestination(HOME_PLACE)}>
              <Ionicons name="home-outline" size={20} color={colors.text} />
              <Text style={styles.quickLabel}>Casa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => goToDestination(WORK_PLACE)}>
              <Ionicons name="briefcase-outline" size={20} color={colors.text} />
              <Text style={styles.quickLabel}>Trabajo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/activity')}>
              <Ionicons name="time-outline" size={20} color={colors.text} />
              <Text style={styles.quickLabel}>Recientes</Text>
            </TouchableOpacity>
          </View>
        </BottomCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerSideRight: {
    justifyContent: 'flex-end',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  menuBtn: {
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
  },
  greeting: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.md,
  },
  tripStat: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  destinationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  destinationText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  deliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  deliveryText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  quickLabel: {
    ...typography.caption,
    color: colors.text,
  },
});
