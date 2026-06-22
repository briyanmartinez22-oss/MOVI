import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, VehicleBadge } from '../../src/components';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import {
  cancelOwnerVehicleInvite,
  fetchOwnerVehicleInvites,
  inviteDriver,
  regenerateOwnerVehicleInvite,
  type VehicleInviteRecord,
} from '../../src/services/api';
import { getVehicle } from '../../src/services/profileData';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import {
  canVehicleInviteDrivers,
  getVehicleApprovalHint,
  getVehicleStatusLabel,
} from '../../src/utils/vehicleStatus';
import { showSuccess } from '../../src/utils/feedback';
import { colors, typography, spacing } from '../../src/theme';

export default function InviteDriver() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useProfileBootstrap('owner');
  const vehicle = getVehicle(id ?? '');
  const [code, setCode] = useState('');
  const [invites, setInvites] = useState<VehicleInviteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);

  const loadInvites = useCallback(async () => {
    if (!vehicle) return;
    setLoadingInvites(true);
    setInvites(await fetchOwnerVehicleInvites(vehicle.vehicleId));
    setLoadingInvites(false);
  }, [vehicle]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

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
    const res = await inviteDriver(vehicle.vehicleId);
    setLoading(false);
    if (res.ok && res.data) {
      setCode(res.data.code);
      showSuccess('Código generado', 'Comparte el código con tu conductor.');
      await loadInvites();
    } else {
      Alert.alert('Error', res.error ?? 'No se pudo generar código');
    }
  };

  const copyCode = async (value: string) => {
    await Clipboard.setStringAsync(value);
    showSuccess('Copiado', 'Código copiado al portapapeles.');
  };

  const handleCancel = async (inviteId: string) => {
    const res = await cancelOwnerVehicleInvite(inviteId);
    if (!res.ok) {
      Alert.alert('Error', res.error ?? 'No se pudo cancelar');
      return;
    }
    await loadInvites();
  };

  const handleRegenerate = async (inviteId: string) => {
    const res = await regenerateOwnerVehicleInvite(inviteId);
    if (!res.ok || !res.data) {
      Alert.alert('Error', res.error ?? 'No se pudo regenerar');
      return;
    }
    setCode(res.data.code);
    await loadInvites();
  };

  if (!vehicle) return null;

  const canInvite = canVehicleInviteDrivers(vehicle.status);
  const approvalHint = getVehicleApprovalHint(vehicle.status);
  const activeInvite = invites.find((i) => i.status === 'ACTIVE');

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Invitar conductor" />
      <ScrollView contentContainerStyle={styles.content}>
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
        {(code || activeInvite?.code) ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Código de invitación</Text>
            <Text style={styles.code}>{code || activeInvite?.code}</Text>
            <PrimaryButton
              title="Copiar código"
              variant="outline"
              onPress={() => void copyCode(code || activeInvite?.code || '')}
              style={{ marginTop: spacing.md }}
            />
            <Text style={styles.hint}>Comparte este código con tu conductor</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Historial de invitaciones</Text>
        {loadingInvites ? (
          <Text style={styles.hint}>Cargando…</Text>
        ) : invites.length === 0 ? (
          <Text style={styles.hint}>Aún no hay invitaciones para este vehículo.</Text>
        ) : (
          invites.map((invite) => (
            <Card key={invite.id} style={styles.inviteCard}>
              <Text style={styles.inviteCode}>{invite.code}</Text>
              <Text style={styles.row}>Estado: {invite.status}</Text>
              <Text style={styles.row}>
                Expira: {new Date(invite.expiresAt).toLocaleDateString()}
              </Text>
              <View style={styles.inviteActions}>
                <TouchableOpacity onPress={() => void copyCode(invite.code)}>
                  <Text style={styles.link}>Copiar</Text>
                </TouchableOpacity>
                {invite.status === 'ACTIVE' ? (
                  <>
                    <TouchableOpacity onPress={() => void handleCancel(invite.id)}>
                      <Text style={styles.linkDanger}>Revocar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => void handleRegenerate(invite.id)}>
                      <Text style={styles.link}>Regenerar</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
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
  row: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  status: { ...typography.bodyMedium, color: colors.primary, marginTop: spacing.sm },
  hintBox: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  blocked: { ...typography.caption, color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
  codeBox: {
    alignItems: 'center',
    marginTop: spacing.xl,
    backgroundColor: colors.borderLight,
    padding: spacing.xl,
    borderRadius: 16,
  },
  codeLabel: { ...typography.caption, color: colors.textMuted },
  code: { ...typography.hero, color: colors.text, letterSpacing: 4, marginVertical: spacing.md },
  hint: { ...typography.caption, color: colors.textSecondary },
  section: { ...typography.subtitle, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  inviteCard: { marginBottom: spacing.sm },
  inviteCode: { ...typography.bodyMedium, color: colors.text, letterSpacing: 1 },
  inviteActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  link: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  linkDanger: { ...typography.caption, color: colors.danger, fontWeight: '600' },
});
