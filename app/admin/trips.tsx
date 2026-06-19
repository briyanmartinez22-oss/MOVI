import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { fetchAdminTrips, fetchAdminRequests } from '../../src/services/api';
import type { TripRequest } from '../../src/types';
import { colors, typography, spacing } from '../../src/theme';

export default function AdminTripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripRequest[]>([]);
  const [requests, setRequests] = useState<TripRequest[]>([]);

  const load = useCallback(async () => {
    const [t, r] = await Promise.all([fetchAdminTrips(), fetchAdminRequests()]);
    setTrips(t);
    setRequests(r);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Viajes y solicitudes" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Solicitudes activas ({requests.length})</Text>
        {requests.map((t) => (
          <Card key={t.id} style={styles.item}>
            <Text style={styles.name}>{t.passengerName}</Text>
            <Text style={styles.meta}>{t.origin.name} → {t.destination.name}</Text>
            <Text style={styles.meta}>Estado: {t.lifecycleStatus} · Ofertas: {t.offers.length}</Text>
          </Card>
        ))}

        <Text style={styles.section}>Viajes recientes ({trips.length})</Text>
        {trips.map((t) => (
          <Card key={`trip-${t.id}`} style={styles.item}>
            <Text style={styles.name}>{t.passengerName}</Text>
            <Text style={styles.meta}>{t.origin.name} → {t.destination.name}</Text>
            <Text style={styles.meta}>Estado: {t.lifecycleStatus}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  section: { ...typography.subtitle, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  item: { marginBottom: spacing.md },
  name: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
