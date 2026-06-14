import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MoviLogo } from '../../src/components/MoviLogo';
import { BrandTagline } from '../../src/components/BrandTagline';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { useAuth, formatTime } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import {
  getOwnerByUserId,
  getOwnerDashboardStats,
  getOwnerVehicles,
  getOwnerDrivers,
  getOwnerSessions,
  getTripHistory,
  formatDuration,
} from '../../src/services/profileData';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function OwnerDashboard() {
  const router = useRouter();
  const { user, getDailySessionSummary } = useAuth();
  const { loading, error } = useProfileBootstrap('owner');
  const owner = user ? getOwnerByUserId(user.userId) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Dashboard dueño" />
        <BrandedLoadingView message="Cargando datos…" />
      </SafeAreaView>
    );
  }

  if (!owner) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Dashboard dueño" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.greeting}>Registra tu perfil de dueño primero</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/auth/register-owner' as never)}
          >
            <Ionicons name="person-add" size={22} color={colors.text} />
            <Text style={styles.menuText}>Completar registro de dueño</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const vehicles = getOwnerVehicles(owner.id);
  const drivers = getOwnerDrivers(owner.id);
  const sessions = getOwnerSessions(owner.id);

  const ownerStats = getOwnerDashboardStats(owner.id);
  const totalCash = ownerStats?.income ?? sessions.reduce((a, s) => a + s.totalCashCollected, 0);
  const totalTrips = ownerStats?.trips ?? sessions.reduce((a, s) => a + s.totalTrips, 0);
  const totalKm = ownerStats?.kilometers ?? sessions.reduce((a, s) => a + s.totalKm, 0);
  const totalDeliveries = ownerStats?.deliveries ?? 0;
  const activeDrivers = drivers.filter((d) =>
    sessions.some((s) => s.driverId === d.id && !s.disconnectedAt)
  ).length;

  const tripHistory = getTripHistory({ ownerId: owner.id });

  const menu = [
    { title: 'Mis unidades', route: '/owner/vehicles', icon: 'car' as const },
    { title: 'Reportes', route: '/owner/reports', icon: 'bar-chart' as const },
    { title: 'Centro de actividad', route: '/activity', icon: 'pulse' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Dashboard dueño" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.logoWrap}>
          <MoviLogo size="md" />
        </View>
        <BrandTagline variant="secondary" />
        <Text style={styles.greeting}>Hola, {owner.name}</Text>
        <Text style={styles.status}>Estado: {owner.status}</Text>

        <View style={styles.statsGrid}>
          <Card style={styles.stat}><Text style={styles.statValue}>${totalCash.toFixed(2)}</Text><Text style={styles.statLabel}>Total cobrado</Text></Card>
          <Card style={styles.stat}><Text style={styles.statValue}>{totalTrips}</Text><Text style={styles.statLabel}>Viajes</Text></Card>
          <Card style={styles.stat}><Text style={styles.statValue}>{totalKm.toFixed(1)}</Text><Text style={styles.statLabel}>Km</Text></Card>
          <Card style={styles.stat}><Text style={styles.statValue}>{totalDeliveries}</Text><Text style={styles.statLabel}>Entregas</Text></Card>
          <Card style={styles.stat}><Text style={styles.statValue}>{(ownerStats?.activeHours ?? 0).toFixed(0)}h</Text><Text style={styles.statLabel}>Horas activas</Text></Card>
          <Card style={styles.stat}><Text style={styles.statValue}>{activeDrivers}</Text><Text style={styles.statLabel}>Conductores activos</Text></Card>
        </View>

        <Text style={styles.section}>Historial de viajes ({tripHistory.length})</Text>
        {tripHistory.slice(0, 5).map((trip) => (
          <Card key={trip.id} style={{ marginBottom: spacing.sm }}>
            <Text style={styles.driverName}>{trip.originName} → {trip.destinationName}</Text>
            <Text style={styles.sessionLine}>{trip.driverName} · ${trip.price.toFixed(2)} · {trip.distanceKm.toFixed(1)} km</Text>
          </Card>
        ))}

        <Text style={styles.section}>Sesiones del día</Text>
        {drivers.map((driver) => {
          const summary = getDailySessionSummary(driver.id);
          return (
            <Card key={driver.id} style={{ marginBottom: spacing.md }}>
              <Text style={styles.driverName}>{driver.name}</Text>
              {summary.sessions.map((sess, i) => (
                <View key={sess.sessionId} style={styles.sessionBlock}>
                  <Text style={styles.sessionTitle}>Sesión {i + 1}</Text>
                  <Text style={styles.sessionLine}>Conectado: {formatTime(sess.connectedAt)}</Text>
                  <Text style={styles.sessionLine}>
                    Desconectado: {sess.disconnectedAt ? formatTime(sess.disconnectedAt) : 'En curso'}
                  </Text>
                  <Text style={styles.sessionLine}>Duración: {formatDuration(sess.durationMinutes)}</Text>
                  <Text style={styles.sessionLine}>Viajes: {sess.totalTrips} · Km: {sess.totalKm} · ${sess.totalCashCollected.toFixed(2)}</Text>
                </View>
              ))}
              <Text style={styles.summary}>
                Resumen: {summary.connectionCount} conexiones · {summary.totalHours}h · {summary.totalTrips} viajes · ${summary.totalCashCollected.toFixed(2)}
              </Text>
            </Card>
          );
        })}

        {menu.map((item) => (
          <TouchableOpacity key={item.route} style={styles.menuItem} onPress={() => router.push(item.route as never)}>
            <Ionicons name={item.icon} size={22} color={colors.text} />
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xs },
  greeting: { ...typography.subtitle, color: colors.text, marginTop: spacing.sm },
  status: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg, textTransform: 'capitalize' },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { width: '48%', alignItems: 'center' },
  statValue: { ...typography.subtitle, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md },
  driverName: { ...typography.bodyMedium, color: colors.text, marginBottom: spacing.sm },
  sessionBlock: { backgroundColor: colors.borderLight, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  sessionTitle: { ...typography.label, color: colors.text },
  sessionLine: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  summary: { ...typography.caption, color: colors.text, marginTop: spacing.sm, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.sm, gap: spacing.md },
  menuText: { ...typography.body, color: colors.text, flex: 1 },
});
