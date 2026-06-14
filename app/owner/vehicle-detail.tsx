import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, VehicleBadge } from '../../src/components';
import { Card, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import { getVehicle, getOwnerDrivers } from '../../src/services/profileData';
import {
  canVehicleInviteDrivers,
  canVehicleOperate,
  getVehicleApprovalHint,
  getVehicleStatusLabel,
} from '../../src/utils/vehicleStatus';
import { colors, typography, spacing } from '../../src/theme';

export default function VehicleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicle = getVehicle(id ?? '');
  const driver = vehicle?.driverId
    ? getOwnerDrivers(vehicle.ownerId).find((d) => d.id === vehicle.driverId)
    : null;

  if (!vehicle) return null;

  const approvalHint = getVehicleApprovalHint(vehicle.status);
  const canInvite = canVehicleInviteDrivers(vehicle.status);
  const canOperate = canVehicleOperate(vehicle.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`Unidad #${vehicle.unitNumber}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <VehicleBadge type={vehicle.vehicleType} />
          <Text style={styles.row}>Placa: {vehicle.plateNumber}</Text>
          <Text style={styles.row}>Asociación: {vehicle.associationName}</Text>
          <StatusBadge status={getVehicleStatusLabel(vehicle.status)} />
          {approvalHint ? <Text style={styles.hint}>{approvalHint}</Text> : null}
          {!canOperate ? (
            <Text style={styles.warning}>Este vehículo aún no puede operar.</Text>
          ) : (
            <Text style={styles.ok}>Vehículo aprobado — puede recibir servicios.</Text>
          )}
          {driver && <Text style={styles.row}>Conductor: {driver.name}</Text>}
        </Card>
        <PrimaryButton
          title="Invitar conductor"
          onPress={() => router.push({ pathname: '/owner/invite-driver', params: { id: vehicle.vehicleId } })}
          disabled={!canInvite}
          style={{ marginTop: spacing.lg }}
        />
        {!canInvite ? (
          <Text style={styles.blocked}>
            Ya podrás invitar conductores cuando el vehículo sea aprobado.
          </Text>
        ) : (
          <Text style={styles.ok}>Ya puedes invitar conductores.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  row: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  warning: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  ok: { ...typography.caption, color: colors.primary, marginTop: spacing.sm },
  blocked: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
});
