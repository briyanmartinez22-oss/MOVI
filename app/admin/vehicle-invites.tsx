import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { Card } from '../../src/components/FormUI';
import {
  extendAdminVehicleInvite,
  fetchAdminVehicleInvites,
  regenerateAdminVehicleInvite,
  revokeAdminVehicleInvite,
  type VehicleInviteRecord,
} from '../../src/services/api';
import { colors, spacing, typography } from '../../src/theme';

function statusColor(status: string) {
  if (status === 'ACTIVE') return colors.primary;
  if (status === 'USED') return colors.textMuted;
  if (status === 'EXPIRED' || status === 'REVOKED') return colors.danger;
  return colors.textSecondary;
}

export default function AdminVehicleInvitesScreen() {
  const router = useRouter();
  const [invites, setInvites] = useState<VehicleInviteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setInvites(await fetchAdminVehicleInvites());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string }>
  ) => {
    const res = await fn();
    if (!res.ok) {
      Alert.alert('Error', res.error ?? `No se pudo ${label}`);
      return;
    }
    await load();
  };

  return (
    <AdminModulePage title="Invitaciones de vehículo" loading={loading} onBack={() => router.back()}>
      {invites.length === 0 ? (
        <Text style={styles.empty}>No hay invitaciones registradas.</Text>
      ) : (
        invites.map((invite) => (
          <Card key={invite.id} style={styles.card}>
            <Text style={styles.code}>{invite.code}</Text>
            <Text style={styles.row}>Estado: {invite.status}</Text>
            <Text style={[styles.row, { color: statusColor(invite.status) }]}>
              Expira: {new Date(invite.expiresAt).toLocaleString()}
            </Text>
            <Text style={styles.row}>
              Vehículo: #{invite.vehicle?.unitNumber ?? '—'}{' '}
              {invite.vehicle?.brand ?? ''} {invite.vehicle?.model ?? ''}
            </Text>
            <Text style={styles.row}>Dueño: {invite.owner?.name ?? '—'}</Text>
            <Text style={styles.row}>
              Usos: {invite.currentUses ?? invite.usedCount}/{invite.maxUses}
            </Text>
            <View style={styles.actions}>
              {invite.status === 'ACTIVE' ? (
                <>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      void runAction('revocar', () => revokeAdminVehicleInvite(invite.id))
                    }
                  >
                    <Text style={styles.actionText}>Revocar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      void runAction('extender', () => extendAdminVehicleInvite(invite.id))
                    }
                  >
                    <Text style={styles.actionText}>Extender</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      void runAction('regenerar', () => regenerateAdminVehicleInvite(invite.id))
                    }
                  >
                    <Text style={styles.actionText}>Regenerar</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </AdminModulePage>
  );
}

const styles = StyleSheet.create({
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  card: { marginBottom: spacing.md },
  code: { ...typography.subtitle, color: colors.text, letterSpacing: 2, marginBottom: spacing.sm },
  row: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  actionText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
