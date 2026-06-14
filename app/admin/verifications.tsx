import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components';
import { Card, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import * as mockApi from '../../src/services/mockApi';
import { fetchPendingVerifications } from '../../src/services/mockApi';
import { useAuth } from '../../src/context/AuthContext';
import type { DriverProfileRecord, Owner, Vehicle } from '../../src/types/models';
import { colors, typography, spacing } from '../../src/theme';

type PendingVerifications = {
  owners: Owner[];
  vehicles: Vehicle[];
  drivers: DriverProfileRecord[];
};

function vehicleIdOf(vehicle: Vehicle & { id?: string }): string {
  return vehicle.vehicleId ?? vehicle.id ?? '';
}

export default function AdminVerifications() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [pending, setPending] = useState<PendingVerifications>({
    owners: [],
    vehicles: [],
    drivers: [],
  });

  const loadPending = useCallback(async () => {
    const data = await fetchPendingVerifications();
    if (data && typeof data === 'object') {
      const record = data as Partial<PendingVerifications>;
      setPending({
        owners: record.owners ?? [],
        vehicles: record.vehicles ?? [],
        drivers: record.drivers ?? [],
      });
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const handleApproveOwner = async (id: string) => {
    await mockApi.approveOwner(id);
    refresh();
    await loadPending();
    Alert.alert('Aprobado', 'Dueño aprobado');
  };

  const handleRejectOwner = async (id: string) => {
    await mockApi.rejectOwner(id);
    refresh();
    await loadPending();
    Alert.alert('Rechazado', 'Dueño rechazado');
  };

  const handleApproveVehicle = async (id: string) => {
    await mockApi.approveVehicle(id);
    refresh();
    await loadPending();
    Alert.alert('Aprobado', 'Vehículo aprobado');
  };

  const handleRejectVehicle = async (id: string) => {
    await mockApi.rejectVehicle(id);
    refresh();
    await loadPending();
    Alert.alert('Rechazado', 'Vehículo rechazado');
  };

  const { owners: pendingOwners, vehicles: pendingVehicles, drivers: pendingDrivers } = pending;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Verificaciones" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Dueños pendientes</Text>
        {pendingOwners.map((o) => (
          <Card key={o.id} style={styles.item}>
            <Text style={styles.name}>{o.name}</Text>
            <Text style={styles.meta}>DUI: {o.dui}</Text>
            <StatusBadge status={o.status} />
            <View style={styles.actions}>
              <PrimaryButton title="Aprobar" onPress={() => handleApproveOwner(o.id)} style={styles.btn} />
              <PrimaryButton title="Rechazar" onPress={() => handleRejectOwner(o.id)} variant="outline" style={styles.btn} />
            </View>
          </Card>
        ))}

        <Text style={styles.section}>Vehículos pendientes</Text>
        {pendingVehicles.map((v) => {
          const id = vehicleIdOf(v);
          return (
            <Card key={id} style={styles.item}>
              <Text style={styles.name}>Unidad #{v.unitNumber} · {v.plateNumber}</Text>
              <StatusBadge status={v.status} />
              <View style={styles.actions}>
                <PrimaryButton title="Aprobar" onPress={() => handleApproveVehicle(id)} style={styles.btn} />
                <PrimaryButton title="Rechazar" onPress={() => handleRejectVehicle(id)} variant="outline" style={styles.btn} />
              </View>
            </Card>
          );
        })}

        <Text style={styles.section}>Conductores pendientes</Text>
        {pendingDrivers.length === 0 && (
          <Text style={styles.empty}>No hay conductores pendientes</Text>
        )}
        {pendingDrivers.map((d) => (
          <Card key={d.id} style={styles.item}>
            <Text style={styles.name}>{d.name}</Text>
            <StatusBadge status={d.status} />
            <View style={styles.actions}>
              <PrimaryButton title="Aprobar" onPress={async () => { await mockApi.approveDriver(d.id); refresh(); await loadPending(); Alert.alert('Aprobado', 'Conductor aprobado'); }} style={styles.btn} />
              <PrimaryButton title="Rechazar" onPress={async () => { await mockApi.rejectDriver(d.id); refresh(); await loadPending(); Alert.alert('Rechazado', 'Conductor rechazado'); }} variant="outline" style={styles.btn} />
            </View>
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
  meta: { ...typography.caption, color: colors.textSecondary, marginVertical: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1 },
  empty: { ...typography.caption, color: colors.textMuted },
});
