import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
import {
  canDriverOperateVehicle,
  getDriverApprovalHint,
  getDriverStatusLabel,
  hasDriverLicenseUploaded,
} from '../../src/utils/driverStatus';
import { showError, showSuccess } from '../../src/utils/feedback';
import { colors, typography, spacing } from '../../src/theme';

export default function VehicleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reload } = useProfileBootstrap('owner');
  const [selfAssigning, setSelfAssigning] = useState(false);
  const [licenseFront, setLicenseFront] = useState('');
  const [licenseBack, setLicenseBack] = useState('');
  const [error, setError] = useState('');
  const vehicle = getVehicle(id ?? '');
  const vehicleDriver = vehicle
    ? getOwnerDrivers(vehicle.ownerId).find((d) => d.vehicleId === vehicle.vehicleId)
    : null;

  useEffect(() => {
    if (vehicleDriver) {
      setLicenseFront(vehicleDriver.licenseFront ?? '');
      setLicenseBack(vehicleDriver.licenseBack ?? '');
    }
  }, [vehicleDriver?.id, vehicleDriver?.licenseFront, vehicleDriver?.licenseBack]);

  if (!vehicle) return null;

  const approvalHint = getVehicleApprovalHint(vehicle.status);
  const canInvite = canVehicleInviteDrivers(vehicle.status);
  const canOperateVehicle = canVehicleOperate(vehicle.status);
  const driverPending = vehicleDriver?.status === 'pending';
  const driverApproved = vehicleDriver && canDriverOperateVehicle(vehicleDriver.status);
  const canSelfAssign = canOperateVehicle && !vehicleDriver;
  const canReplaceLicense = Boolean(vehicleDriver && !driverApproved);
  const driverHint = vehicleDriver ? getDriverApprovalHint(vehicleDriver.status) : null;

  const uploadLicense = async (side: 'front' | 'back') => {
    setError('');
    const { pickAndUploadDocument } = await import('../../src/services/uploadService');
    const url = await pickAndUploadDocument(side === 'front' ? 'licenseFront' : 'licenseBack');
    if (!url) {
      setError('No se pudo subir la imagen. Intenta de nuevo.');
      return;
    }
    if (side === 'front') setLicenseFront(url);
    else setLicenseBack(url);
  };

  const submitSelfAssign = async () => {
    if (!licenseFront || !licenseBack) {
      setError('Sube licencia frontal y trasera antes de continuar.');
      return;
    }
    setSelfAssigning(true);
    setError('');
    const res = await selfAssignOwnerAsDriver(vehicle.vehicleId, licenseFront, licenseBack);
    setSelfAssigning(false);
    if (!res.ok) {
      const msg = res.error ?? 'Intenta de nuevo';
      setError(msg);
      showError('No se pudo enviar', msg);
      return;
    }
    if (res.data?.licenseFront) setLicenseFront(res.data.licenseFront);
    if (res.data?.licenseBack) setLicenseBack(res.data.licenseBack);
    await reload();
    showSuccess(
      driverApproved ? 'Conductor aprobado' : 'Licencia enviada',
      res.data?.message ??
        'Tu perfil de conductor está pendiente de aprobación por un administrador.'
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
          {vehicleDriver ? (
            <>
              <Text style={styles.row}>Conductor: {vehicleDriver.name}</Text>
              <StatusBadge status={getDriverStatusLabel(vehicleDriver.status)} />
              {driverHint ? <Text style={styles.hint}>{driverHint}</Text> : null}
            </>
          ) : null}
        </Card>

        {canOperateVehicle && (canSelfAssign || canReplaceLicense) ? (
          <Card style={styles.licenseCard}>
            <Text style={styles.section}>Licencia de conducir</Text>
            <TouchableOpacity style={styles.docBtn} onPress={() => void uploadLicense('front')}>
              <Text style={styles.docLabel}>Licencia — frontal</Text>
              <Text style={styles.docAction}>{licenseFront ? '✓ Subida' : 'Subir foto'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.docBtn} onPress={() => void uploadLicense('back')}>
              <Text style={styles.docLabel}>Licencia — trasera</Text>
              <Text style={styles.docAction}>{licenseBack ? '✓ Subida' : 'Subir foto'}</Text>
            </TouchableOpacity>
            {hasDriverLicenseUploaded({ licenseFront, licenseBack }) && driverPending ? (
              <Text style={styles.successHint}>Licencia registrada. Pendiente de aprobación.</Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              title={
                vehicleDriver
                  ? 'Actualizar licencia / reenviar'
                  : 'Enviar licencia y operar vehículo'
              }
              onPress={() => void submitSelfAssign()}
              loading={selfAssigning}
              disabled={!licenseFront || !licenseBack}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : null}

        {driverApproved ? (
          <Text style={styles.successHint}>Ya puedes operar esta unidad como conductor.</Text>
        ) : null}

        <PrimaryButton
          title="Invitar conductor"
          onPress={() => router.push({ pathname: '/owner/invite-driver', params: { id: vehicle.vehicleId } })}
          disabled={!canInvite || !!vehicleDriver}
          variant="outline"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  row: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  successHint: { ...typography.body, color: colors.online, marginTop: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  licenseCard: { gap: spacing.sm },
  docBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: 12,
  },
  docLabel: { ...typography.body, color: colors.text, flex: 1 },
  docAction: { ...typography.caption, color: colors.textSecondary },
});
