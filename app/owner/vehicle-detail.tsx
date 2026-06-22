import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, VehicleBadge } from '../../src/components';
import { Card, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import { selfAssignOwnerAsDriver } from '../../src/services/api';
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
  const { reload } = useProfileBootstrap('owner');
  const [selfAssigning, setSelfAssigning] = useState(false);
  const vehicle = getVehicle(id ?? '');
  const driver = vehicle?.driverId
    ? getOwnerDrivers(vehicle.ownerId).find((d) => d.id === vehicle.driverId)
    : null;

  if (!vehicle) return null;

  const approvalHint = getVehicleApprovalHint(vehicle.status);
  const canInvite = canVehicleInviteDrivers(vehicle.status);
  const canOperate = canVehicleOperate(vehicle.status);
  const canSelfAssign = canOperate && !driver;

  const runSelfAssign = async (licenseFront: string, licenseBack: string) => {
    setSelfAssigning(true);
    const res = await selfAssignOwnerAsDriver(vehicle.vehicleId, licenseFront, licenseBack);
    setSelfAssigning(false);
    if (!res.ok) {
      Alert.alert('No se pudo asignar', res.error ?? 'Intenta de nuevo');
      return;
    }
    await reload();
    Alert.alert(
      'Perfil de conductor creado',
      'Tu solicitud está pendiente de aprobación por un administrador.'
    );
  };

  const handleSelfAssign = () => {
    Alert.alert(
      'Operaré este vehículo',
      'Necesitas subir licencia de conducir (frontal y trasera).',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Subir licencia',
          onPress: () => {
            void (async () => {
              const { pickAndUploadDocument } = await import('../../src/services/uploadService');
              const front = await pickAndUploadDocument('licenseFront');
              if (!front) return;
              const back = await pickAndUploadDocument('licenseBack');
              if (!back) return;
              await runSelfAssign(front, back);
            })();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`Unidad #${vehicle.unitNumber}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <VehicleBadge type={vehicle.vehicleType} />
          <Text style={styles.row}>Placa: {vehicle.plateNumber}</Text>
          <Text style={styles.row}>Marca/Modelo: {vehicle.brand ?? '—'} {vehicle.model ?? ''}</Text>
          <Text style={styles.row}>Asociación: {vehicle.associationName}</Text>
          <StatusBadge status={getVehicleStatusLabel(vehicle.status)} />
          {approvalHint ? <Text style={styles.hint}>{approvalHint}</Text> : null}
          {driver && <Text style={styles.row}>Conductor: {driver.name}</Text>}
        </Card>
        <PrimaryButton
          title="Operaré este vehículo"
          onPress={handleSelfAssign}
          loading={selfAssigning}
          disabled={!canSelfAssign}
          style={{ marginTop: spacing.lg }}
        />
        <PrimaryButton
          title="Invitar conductor"
          onPress={() => router.push({ pathname: '/owner/invite-driver', params: { id: vehicle.vehicleId } })}
          disabled={!canInvite || !!driver}
          variant="outline"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  row: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
});
