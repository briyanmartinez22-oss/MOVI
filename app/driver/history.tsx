import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { TripHistoryCard } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import { fetchTripHistoryForRole } from '../../src/services/mockApi';
import {
  getDriverByUserId,
  getTripHistory,
  getAllSessionsByDriver,
  formatTime,
  formatDuration,
} from '../../src/services/profileData';
import { colors, typography, spacing } from '../../src/theme';

export default function DriverHistoryScreen() {
  const { user } = useAuth();
  const { loading, error } = useProfileBootstrap();
  const [historyReady, setHistoryReady] = useState(false);
  const driver = user ? getDriverByUserId(user.userId) : null;

  useEffect(() => {
    void fetchTripHistoryForRole().finally(() => setHistoryReady(true));
  }, []);

  const trips = driver ? getTripHistory({ driverId: driver.id }) : [];
  const sessions = driver ? getAllSessionsByDriver(driver.id) : [];

  if (loading || !historyReady) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Historial" />
        <BrandedLoadingView message="Cargando historial…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Historial" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.section}>Historial de viajes ({trips.length})</Text>
        {trips.length === 0 ? (
          <Text style={styles.empty}>Aún no hay viajes en el historial</Text>
        ) : (
          trips.map((trip) => <TripHistoryCard key={trip.id} trip={trip} />)
        )}

        <Text style={styles.section}>Todas las conexiones ({sessions.length})</Text>
        {sessions.map((s, i) => (
          <Card key={s.sessionId} style={styles.card}>
            <Text style={styles.route}>Conexión {sessions.length - i}</Text>
            <Text style={styles.meta}>Conectado: {formatTime(s.connectedAt)}</Text>
            <Text style={styles.meta}>
              Desconectado: {s.disconnectedAt ? formatTime(s.disconnectedAt) : 'En curso'}
            </Text>
            <Text style={styles.meta}>
              Duración: {formatDuration(s.durationMinutes)} · Viajes: {s.totalTrips} · ${s.totalCashCollected.toFixed(2)}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  empty: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  date: { ...typography.caption, color: colors.textMuted },
  route: { ...typography.bodyMedium, color: colors.text, marginTop: 4 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  price: { ...typography.subtitle, color: colors.text, marginTop: spacing.sm },
});
