import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { useAuth } from '../../src/context/AuthContext';
import { getDriverByUserId, getOwnerByUserId, getVehicle } from '../../src/services/profileData';
import { canOperate } from '../../src/types/models';
import { fetchDriverSubscription } from '../../src/services/api';
import {
  mapDriverMvpStatus,
  mapOwnerMvpStatus,
  mapVehicleMvpStatus,
  MVP_STATUS_LABELS,
  isVerified,
} from '../../src/utils/verificationStatus';
import { canOperateWithSubscription, MVP_SUBSCRIPTION_LABELS } from '../../src/utils/subscriptionStatus';
import { colors, typography, spacing } from '../../src/theme';

function StatusRow({ label, status }: { label: string; status: string }) {
  const ok = status === 'VERIFIED';
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowStatus, ok ? styles.ok : styles.pending]}>
        {MVP_STATUS_LABELS[status as keyof typeof MVP_STATUS_LABELS] ?? status}
      </Text>
    </View>
  );
}

export default function DriverVerificationStatusScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [subStatus, setSubStatus] = useState('TRIAL');

  const owner = user ? getOwnerByUserId(user.userId) : undefined;
  const driver = user ? getDriverByUserId(user.userId) : undefined;
  const vehicle = driver ? getVehicle(driver.vehicleId) : undefined;

  const ownerMvp = owner ? mapOwnerMvpStatus(owner.status) : 'PENDING_DOCUMENTS';
  const vehicleMvp = vehicle ? mapVehicleMvpStatus(vehicle.status) : 'PENDING_DOCUMENTS';
  const driverMvp = driver ? mapDriverMvpStatus(driver.status) : 'PENDING_REVIEW';

  const loadSub = useCallback(async () => {
    const sub = await fetchDriverSubscription();
    setSubStatus(canOperateWithSubscription(sub ?? undefined).mvpStatus);
  }, []);

  useEffect(() => {
    void loadSub();
  }, [loadSub]);

  const op = canOperate(owner, vehicle, driver);
  const allVerified =
    isVerified(ownerMvp) && isVerified(vehicleMvp) && isVerified(driverMvp) && subStatus !== 'EXPIRED';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Estado de verificación" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.title}>Tu cuenta de proveedor</Text>
        <Text style={styles.subtitle}>
          Solo conductores VERIFIED con suscripción activa pueden conectarse y recibir solicitudes.
        </Text>

        <Card style={styles.card}>
          <StatusRow label="Dueño" status={ownerMvp} />
          <StatusRow label="Vehículo" status={vehicleMvp} />
          <StatusRow label="Conductor" status={driverMvp} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Suscripción</Text>
            <Text style={[styles.rowStatus, subStatus === 'EXPIRED' ? styles.pending : styles.ok]}>
              {MVP_SUBSCRIPTION_LABELS[subStatus as keyof typeof MVP_SUBSCRIPTION_LABELS]}
            </Text>
          </View>
        </Card>

        {!allVerified && (
          <Text style={styles.warning}>
            {op.reason ?? 'Completa verificación y documentos para operar.'}
          </Text>
        )}

        {allVerified ? (
          <PrimaryButton title="Ir a conectar" onPress={() => router.replace('/driver')} />
        ) : (
          <PrimaryButton title="Volver" onPress={() => router.back()} variant="outline" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  card: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowLabel: { ...typography.body, color: colors.text },
  rowStatus: { ...typography.bodyMedium },
  ok: { color: colors.online },
  pending: { color: colors.warning },
  warning: { ...typography.caption, color: colors.warning, marginBottom: spacing.lg },
});
