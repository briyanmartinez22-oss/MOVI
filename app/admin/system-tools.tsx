import { useEffect, useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, PrimaryButton } from '../../src/components';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import {
  adminResetBetaPlatform,
  fetchAdminDataSummary,
  fetchAdminSystemStatus,
} from '../../src/services/api';
import { typography, spacing, colors } from '../../src/theme';

const TOOLS = [
  'npm run db:seed-super-admin',
  'npm run db:verify-super-admin',
  'npm run db:reset-beta -- --confirm',
  'npm run qa:beta-closed',
  'npm run qa:admin-all',
];

export default function AdminSystemToolsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  const reload = async () => {
    setLoading(true);
    setStatus(await fetchAdminSystemStatus());
    setSummary(await fetchAdminDataSummary());
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleResetBeta = () => {
    Alert.alert(
      'Limpiar plataforma',
      'Eliminará viajes, ofertas, conductores, dueños, vehículos y negocios demo. Solo conserva el SUPER_ADMIN.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar todo',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setResetting(true);
              const res = await adminResetBetaPlatform();
              setResetting(false);
              if (!res.ok) {
                Alert.alert('Error', res.error ?? 'No se pudo limpiar');
                return;
              }
              Alert.alert('Plataforma limpia', 'Datos de prueba eliminados. SUPER_ADMIN conservado.');
              await reload();
            })();
          },
        },
      ]
    );
  };

  return (
    <AdminModulePage
      title="System Tools"
      subtitle="Herramientas internas SUPER_ADMIN"
      loading={loading}
      onBack={() => router.replace('/admin')}
    >
      <Card style={styles.card}>
        <Text style={styles.title}>Estado del sistema</Text>
        <Text style={styles.line}>Env: {String(status?.environment ?? '—')}</Text>
        <Text style={styles.line}>
          DB: {String((status?.database as { status?: string })?.status ?? '—')}
        </Text>
        <Text style={styles.line}>
          WS: {(status?.websocket as { active?: boolean })?.active ? 'OK' : '—'}
        </Text>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.title}>Datos en plataforma</Text>
        <Text style={styles.line}>Viajes: {summary?.trips ?? 0}</Text>
        <Text style={styles.line}>Solicitudes (requested): {summary?.tripsRequested ?? 0}</Text>
        <Text style={styles.line}>Viajes activos/pendientes: {summary?.tripsActive ?? 0}</Text>
        <Text style={styles.line}>Ofertas: {summary?.tripOffers ?? 0}</Text>
        <Text style={styles.line}>Conductores: {summary?.drivers ?? 0}</Text>
        <Text style={styles.line}>Dueños: {summary?.owners ?? 0}</Text>
        <Text style={styles.line}>Vehículos: {summary?.vehicles ?? 0}</Text>
        <Text style={styles.line}>Pasajeros: {summary?.passengers ?? 0}</Text>
        <Text style={styles.line}>Negocios: {summary?.businesses ?? 0}</Text>
      </Card>
      <PrimaryButton
        title="Limpiar datos de prueba (beta reset)"
        onPress={handleResetBeta}
        loading={resetting}
        variant="outline"
        style={styles.resetBtn}
      />
      <Text style={styles.section}>Comandos backend (CLI)</Text>
      {TOOLS.map((cmd) => (
        <Card key={cmd} style={styles.card}>
          <Text style={styles.mono}>{cmd}</Text>
        </Card>
      ))}
    </AdminModulePage>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: { ...typography.bodyMedium, color: colors.text, marginBottom: spacing.xs },
  line: { ...typography.caption, color: colors.textSecondary },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  mono: { ...typography.caption, color: colors.text, fontFamily: 'monospace' },
  resetBtn: { marginBottom: spacing.lg },
});
