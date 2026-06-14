import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { useAuth, formatTime } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import {
  getOwnerByUserId,
  getOwnerVehicles,
  getOwnerDrivers,
  getOwnerSessions,
  getTripHistory,
  formatDuration,
} from '../../src/services/profileData';
import { colors, typography, spacing } from '../../src/theme';

export default function OwnerReports() {
  const { user, getDailySessionSummary } = useAuth();
  const { loading, error } = useProfileBootstrap('owner');
  const owner = user ? getOwnerByUserId(user.userId) : null;
  const vehicles = owner ? getOwnerVehicles(owner.id) : [];
  const drivers = owner ? getOwnerDrivers(owner.id) : [];
  const sessions = owner ? getOwnerSessions(owner.id) : [];
  const tripHistory = owner ? getTripHistory({ ownerId: owner.id }) : [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Reportes" />
        <BrandedLoadingView message="Cargando reportes…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Reportes" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.section}>Estadísticas por unidad</Text>
        {vehicles.map((vehicle) => {
          const vehicleTrips = tripHistory.filter((t) =>
            drivers.find((d) => d.id === t.driverId && d.vehicleId === vehicle.vehicleId)
          );
          const km = vehicleTrips.reduce((a, t) => a + t.distanceKm, 0);
          const income = vehicleTrips.reduce((a, t) => a + t.price, 0);
          const vehicleSessions = sessions.filter((s) => s.vehicleId === vehicle.vehicleId);
          const hours = vehicleSessions.reduce((a, s) => a + (s.durationMinutes ?? 0), 0) / 60;
          return (
            <Card key={vehicle.vehicleId} style={{ marginBottom: spacing.md }}>
              <Text style={styles.name}>Unidad #{vehicle.unitNumber} · {vehicle.unitId}</Text>
              <Text style={styles.meta}>Viajes: {vehicleTrips.length} · Km: {km.toFixed(1)}</Text>
              <Text style={styles.meta}>Ingresos: ${income.toFixed(2)} · Horas activas: {hours.toFixed(1)}h</Text>
            </Card>
          );
        })}

        <Text style={styles.section}>Resumen por conductor</Text>
        {drivers.map((driver) => {
          const summary = getDailySessionSummary(driver.id);
          const vehicle = vehicles.find((v) => v.vehicleId === driver.vehicleId);
          return (
            <Card key={driver.id} style={{ marginBottom: spacing.md }}>
              <Text style={styles.name}>{driver.name}</Text>
              <Text style={styles.meta}>Unidad #{vehicle?.unitNumber} · {vehicle?.plateNumber}</Text>
              <Text style={styles.meta}>Conexiones hoy: {summary.connectionCount}</Text>
              <Text style={styles.meta}>Horas: {summary.totalHours}h · Viajes: {summary.totalTrips}</Text>
              <Text style={styles.meta}>Km: {summary.totalKm} · Cobrado: ${summary.totalCashCollected.toFixed(2)}</Text>
              {summary.sessions.map((s, i) => (
                <Text key={s.sessionId} style={styles.session}>
                  Sesión {i + 1}: {formatTime(s.connectedAt)} - {s.disconnectedAt ? formatTime(s.disconnectedAt) : 'En curso'} ({formatDuration(s.durationMinutes)})
                </Text>
              ))}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md },
  name: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  session: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
});
