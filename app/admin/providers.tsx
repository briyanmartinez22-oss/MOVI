import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components';
import { Card, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import {
  approveDriver,
  approveOwner,
  approveVehicle,
  fetchAdminProviders,
  rejectDriver,
  rejectOwner,
  rejectVehicle,
  suspendDriver,
  suspendOwner,
  suspendVehicle,
} from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { colors, typography, spacing } from '../../src/theme';

type Provider = {
  id: string;
  name: string;
  phone: string;
  mvpStatus: string;
  vehicles: {
    vehicleId: string;
    unitNumber: string;
    plateNumber: string;
    vehicleType: string;
    mvpStatus: string;
    driver: { id: string; name: string; mvpStatus: string } | null;
  }[];
};

type EntityType = 'owner' | 'vehicle' | 'driver';
type AdminAction = 'approve' | 'reject' | 'suspend';

const ACTION_LABELS: Record<AdminAction, string> = {
  approve: 'Aprobado',
  reject: 'Rechazado',
  suspend: 'Suspendido',
};

export default function AdminProvidersScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);

  const load = useCallback(async () => {
    const data = await fetchAdminProviders();
    setProviders((data as Provider[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (type: EntityType, action: AdminAction, id: string) => {
    const handlers = {
      owner: { approve: approveOwner, reject: rejectOwner, suspend: suspendOwner },
      vehicle: { approve: approveVehicle, reject: rejectVehicle, suspend: suspendVehicle },
      driver: { approve: approveDriver, reject: rejectDriver, suspend: suspendDriver },
    } as const;

    const res = await handlers[type][action](id);
    if (!res.ok) {
      Alert.alert('Error', res.error ?? 'No se pudo completar la acción');
      return;
    }
    refresh();
    await load();
    Alert.alert(ACTION_LABELS[action], 'Cambio aplicado correctamente');
  };

  const actionButtons = (type: EntityType, id: string, mvpStatus: string) => (
    <View style={styles.actions}>
      {mvpStatus !== 'VERIFIED' && (
        <>
          <PrimaryButton
            title="Aprobar"
            onPress={() => runAction(type, 'approve', id)}
            style={styles.btn}
          />
          <PrimaryButton
            title="Rechazar"
            variant="outline"
            onPress={() => runAction(type, 'reject', id)}
            style={styles.btn}
          />
        </>
      )}
      {mvpStatus !== 'SUSPENDED' && (
        <PrimaryButton
          title={`Suspender ${type === 'owner' ? 'dueño' : type === 'vehicle' ? 'vehículo' : 'conductor'}`}
          variant="outline"
          onPress={() => runAction(type, 'suspend', id)}
          style={styles.btn}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Proveedores" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        {providers.map((p) => (
          <Card key={p.id} style={styles.item}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.meta}>{p.phone}</Text>
            <StatusBadge status={p.mvpStatus} />
            {actionButtons('owner', p.id, p.mvpStatus)}
            {p.vehicles.map((v) => (
              <View key={v.vehicleId} style={styles.vehicle}>
                <Text style={styles.meta}>
                  Unidad #{v.unitNumber} · {v.plateNumber} · {v.vehicleType}
                </Text>
                <StatusBadge status={v.mvpStatus} />
                {actionButtons('vehicle', v.vehicleId, v.mvpStatus)}
                {v.driver && (
                  <>
                    <Text style={styles.meta}>Conductor: {v.driver.name}</Text>
                    <StatusBadge status={v.driver.mvpStatus} />
                    {actionButtons('driver', v.driver.id, v.driver.mvpStatus)}
                  </>
                )}
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  item: { marginBottom: spacing.md },
  name: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginVertical: spacing.xs },
  actions: { marginTop: spacing.sm },
  btn: { marginTop: spacing.sm },
  vehicle: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
