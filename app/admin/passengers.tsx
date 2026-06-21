import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { fetchAdminPassengers } from '../../src/services/api';
import type { AdminPassengerRecord } from '../../src/types/adminUsers';
import { colors, typography, spacing } from '../../src/theme';

export default function AdminPassengersScreen() {
  const router = useRouter();
  const [passengers, setPassengers] = useState<AdminPassengerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminPassengers();
    setPassengers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Pasajeros" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>Directorio de pasajeros · PostgreSQL</Text>
        {loading ? (
          <ActivityIndicator color={colors.brandRed} style={styles.loader} />
        ) : passengers.length === 0 ? (
          <Text style={styles.empty}>Sin pasajeros registrados</Text>
        ) : (
          passengers.map((p) => (
            <Card key={p.id} style={styles.item}>
              <Text style={styles.name}>{p.fullName}</Text>
              <Text style={styles.meta}>{p.phoneNumber}</Text>
              {p.duiNumber ? <Text style={styles.meta}>DUI: {p.duiNumber}</Text> : null}
              <Text style={styles.meta}>
                Viajes: {p.totalTrips} · Completados: {p.completedTrips}
                {p.phoneVerified ? ' · Tel. verificado' : ''}
              </Text>
              <Text style={styles.meta}>
                Registro: {new Date(p.createdAt).toLocaleDateString('es-SV')}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  loader: { marginTop: spacing.xl },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  item: { marginBottom: spacing.md },
  name: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
