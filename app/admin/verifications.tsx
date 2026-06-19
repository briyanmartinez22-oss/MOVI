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
  fetchPendingVerifications,
  rejectDriver,
  rejectOwner,
  rejectVehicle,
  suspendDriver,
  suspendOwner,
  suspendVehicle,
} from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { MVP_STATUS_LABELS, type MvpVerificationStatus } from '../../src/utils/verificationStatus';
import { colors, typography, spacing } from '../../src/theme';

type VerificationOwner = {
  id: string;
  name: string;
  dui: string;
  mvpStatus: MvpVerificationStatus;
};

type VerificationVehicle = {
  vehicleId: string;
  unitNumber: string;
  plateNumber: string;
  mvpStatus: MvpVerificationStatus;
};

type VerificationDriver = {
  id: string;
  name: string;
  unitNumber?: string;
  plateNumber?: string;
  mvpStatus: MvpVerificationStatus;
};

type PendingVerifications = {
  owners: VerificationOwner[];
  vehicles: VerificationVehicle[];
  drivers: VerificationDriver[];
};

type EntityType = 'owner' | 'vehicle' | 'driver';
type AdminAction = 'approve' | 'reject' | 'suspend';

const ACTION_LABELS: Record<AdminAction, string> = {
  approve: 'Aprobado',
  reject: 'Rechazado',
  suspend: 'Suspendido',
};

function statusLabel(mvpStatus: MvpVerificationStatus): string {
  return MVP_STATUS_LABELS[mvpStatus] ?? mvpStatus;
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
        owners: (record.owners ?? []) as VerificationOwner[],
        vehicles: (record.vehicles ?? []) as VerificationVehicle[],
        drivers: (record.drivers ?? []) as VerificationDriver[],
      });
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

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
    await loadPending();
    Alert.alert(ACTION_LABELS[action], 'Estado actualizado en el sistema');
  };

  const actionButtons = (type: EntityType, id: string, mvpStatus: MvpVerificationStatus) => (
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
          title="Suspender"
          variant="outline"
          onPress={() => runAction(type, 'suspend', id)}
          style={styles.btn}
        />
      )}
    </View>
  );

  const { owners: pendingOwners, vehicles: pendingVehicles, drivers: pendingDrivers } = pending;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Verificaciones" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Dueños en verificación ({pendingOwners.length})</Text>
        {pendingOwners.length === 0 && (
          <Text style={styles.empty}>No hay dueños pendientes de verificación</Text>
        )}
        {pendingOwners.map((o) => (
          <Card key={o.id} style={styles.item}>
            <Text style={styles.name}>{o.name}</Text>
            <Text style={styles.meta}>DUI: {o.dui}</Text>
            <StatusBadge status={statusLabel(o.mvpStatus)} />
            {actionButtons('owner', o.id, o.mvpStatus)}
          </Card>
        ))}

        <Text style={styles.section}>Vehículos en verificación ({pendingVehicles.length})</Text>
        {pendingVehicles.length === 0 && (
          <Text style={styles.empty}>No hay vehículos pendientes de verificación</Text>
        )}
        {pendingVehicles.map((v) => (
          <Card key={v.vehicleId} style={styles.item}>
            <Text style={styles.name}>
              Unidad #{v.unitNumber} · {v.plateNumber}
            </Text>
            <StatusBadge status={statusLabel(v.mvpStatus)} />
            {actionButtons('vehicle', v.vehicleId, v.mvpStatus)}
          </Card>
        ))}

        <Text style={styles.section}>Conductores en verificación ({pendingDrivers.length})</Text>
        {pendingDrivers.length === 0 && (
          <Text style={styles.empty}>No hay conductores pendientes de verificación</Text>
        )}
        {pendingDrivers.map((d) => (
          <Card key={d.id} style={styles.item}>
            <Text style={styles.name}>{d.name}</Text>
            {d.unitNumber && d.plateNumber ? (
              <Text style={styles.meta}>
                Unidad #{d.unitNumber} · {d.plateNumber}
              </Text>
            ) : null}
            <StatusBadge status={statusLabel(d.mvpStatus)} />
            {actionButtons('driver', d.id, d.mvpStatus)}
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  btn: { flexGrow: 1, minWidth: '30%' },
  empty: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
});
