import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, VehicleBadge } from '../../src/components';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import * as mockApi from '../../src/services/mockApi';
import { getVehicle } from '../../src/services/profileData';
import {
  canVehicleInviteDrivers,
  getVehicleApprovalHint,
  getVehicleStatusLabel,
} from '../../src/utils/vehicleStatus';
import { colors, typography, spacing } from '../../src/theme';

export default function InviteDriver() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicle = getVehicle(id ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!vehicle) return;
    if (!canVehicleInviteDrivers(vehicle.status)) {
      Alert.alert(
        'Vehículo no aprobado',
        getVehicleApprovalHint(vehicle.status) ?? 'Este vehículo aún no puede operar.'
      );
      return;
    }
    setLoading(true);
    const res = await mockApi.inviteDriver(vehicle.vehicleId);
    setLoading(false);
    if (res.ok && res.data) {
      setCode(res.data.code);
    } else {
      Alert.alert('Error', res.error ?? 'No se pudo generar código');
    }
  };

  if (!vehicle) return null;

  const canInvite = canVehicleInviteDrivers(vehicle.status);
  const approvalHint = getVehicleApprovalHint(vehicle.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Invitar conductor" />
      <View style={styles.content}>
        <Card>
          <VehicleBadge type={vehicle.vehicleType} />
          <Text style={styles.row}>Unidad #{vehicle.unitNumber}</Text>
          <Text style={styles.row}>Placa {vehicle.plateNumber}</Text>
          <Text style={styles.status}>{getVehicleStatusLabel(vehicle.status)}</Text>
          {approvalHint ? <Text style={styles.hintBox}>{approvalHint}</Text> : null}
        </Card>
        <PrimaryButton
          title="Generar código"
          onPress={generate}
          loading={loading}
          disabled={!canInvite}
          style={{ marginTop: spacing.lg }}
        />
        {!canInvite ? (
          <Text style={styles.blocked}>
            No puedes invitar conductores hasta que el vehículo esté aprobado.
          </Text>
        ) : null}
        {code ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Código de invitación</Text>
            <Text style={styles.code}>{code}</Text>
            <Text style={styles.hint}>Comparte este código con tu conductor</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  row: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  status: { ...typography.bodyMedium, color: colors.primary, marginTop: spacing.sm },
  hintBox: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  blocked: { ...typography.caption, color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
  codeBox: { alignItems: 'center', marginTop: spacing.xl, backgroundColor: colors.borderLight, padding: spacing.xl, borderRadius: 16 },
  codeLabel: { ...typography.caption, color: colors.textMuted },
  code: { ...typography.hero, color: colors.text, letterSpacing: 4, marginVertical: spacing.md },
  hint: { ...typography.caption, color: colors.textSecondary },
});
