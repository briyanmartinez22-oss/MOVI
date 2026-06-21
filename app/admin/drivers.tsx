import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components';
import { Card, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import {
  approveDriver,
  fetchAdminDrivers,
  rejectDriver,
  suspendDriver,
} from '../../src/services/api';
import type { AdminDriverRecord } from '../../src/types/adminUsers';
import { colors, typography, spacing } from '../../src/theme';

export default function AdminDriversScreen() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<AdminDriverRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminDrivers();
    setDrivers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: 'approve' | 'reject' | 'suspend', driverId: string) => {
    const handlers = { approve: approveDriver, reject: rejectDriver, suspend: suspendDriver };
    const res = await handlers[action](driverId);
    if (!res.ok) {
      Alert.alert('Error', res.error ?? 'No se pudo completar la acción');
      return;
    }
    await load();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Conductores" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>Directorio de conductores · PostgreSQL</Text>
        {loading ? (
          <ActivityIndicator color={colors.brandRed} style={styles.loader} />
        ) : drivers.length === 0 ? (
          <Text style={styles.empty}>Sin conductores registrados</Text>
        ) : (
          drivers.map((d) => (
            <Card key={d.id} style={styles.item}>
              <View style={styles.row}>
                <Text style={styles.name}>{d.name}</Text>
                {d.online ? <Text style={styles.online}>● Online</Text> : null}
              </View>
              <Text style={styles.meta}>{d.phone}</Text>
              <Text style={styles.meta}>
                {d.vehicle
                  ? `Unidad #${d.vehicle.unitNumber} · ${d.vehicle.plateNumber} · ${d.vehicle.vehicleType}`
                  : 'Sin vehículo'}
              </Text>
              <Text style={styles.meta}>
                Dueño: {d.ownerName} · Viajes: {d.totalTrips} · ⭐ {d.rating.toFixed(1)}
              </Text>
              <StatusBadge status={d.mvpStatus} />
              <View style={styles.actions}>
                {d.mvpStatus !== 'VERIFIED' && (
                  <>
                    <PrimaryButton
                      title="Aprobar"
                      onPress={() => runAction('approve', d.id)}
                      style={styles.btn}
                    />
                    <PrimaryButton
                      title="Rechazar"
                      variant="outline"
                      onPress={() => runAction('reject', d.id)}
                      style={styles.btn}
                    />
                  </>
                )}
                {d.mvpStatus !== 'SUSPENDED' && (
                  <PrimaryButton
                    title="Suspender"
                    variant="outline"
                    onPress={() => runAction('suspend', d.id)}
                    style={styles.btn}
                  />
                )}
              </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyMedium, color: colors.text },
  online: { ...typography.caption, color: colors.online, fontWeight: '600' },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  actions: { marginTop: spacing.sm },
  btn: { marginTop: spacing.sm },
});
