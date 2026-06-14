import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  buildDemoManifestFromStore,
  listDemoLoginAccounts,
  type DemoManifest,
} from '../data/demoCredentials';
import { getSimulationMeta, getStore } from '../services/mockStore';
import { DEMO_OTP_CODE } from '../services/otpService';
import { colors, typography, spacing, radius } from '../theme';

/** Credenciales demo leídas del store de autenticación (fuente de verdad). */
export function DemoManifestPanel() {
  const [manifest, setManifest] = useState<DemoManifest | null>(null);

  const refresh = useCallback(() => {
    const store = getStore();
    setManifest(buildDemoManifestFromStore(store));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const meta = getSimulationMeta();
  const accounts = listDemoLoginAccounts(getStore());

  if (!manifest) return null;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Credenciales demo (store de autenticación)</Text>
      {meta ? (
        <Text style={styles.meta}>
          Simulación: {meta.totalPassengers} pasajeros · {meta.totalDrivers} conductores ·{' '}
          {meta.totalTrips.toLocaleString()} viajes · {meta.totalDeliveries.toLocaleString()} entregas · MRR $
          {meta.mrr}
        </Text>
      ) : null}
      <Text style={styles.meta}>OTP: {DEMO_OTP_CODE} · Código abierto: {manifest.inviteCodeOpen}</Text>
      {accounts.map((entry) => (
        <Text key={`${entry.roleLabel}-${entry.userId}`} style={styles.row}>
          {entry.roleLabel}: {entry.phone} · DUI {entry.dui} ·{' '}
          {entry.status === 'ok' ? '✓ login OK' : '✗ no en store'}
        </Text>
      ))}
      <Text style={styles.hint}>
        Toca el logo MOVI 5 veces para restablecer el entorno demo con credenciales sincronizadas.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  row: { ...typography.caption, color: colors.text, fontFamily: 'monospace' },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
});
