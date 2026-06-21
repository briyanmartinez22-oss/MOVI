import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/FormUI';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { fetchAdminSystemStatus } from '../../src/services/api';
import { typography, spacing, colors } from '../../src/theme';

const TOOLS = [
  'npm run db:seed-super-admin',
  'npm run db:verify-super-admin',
  'npm run qa:beta-closed',
  'npm run qa:admin-all',
];

export default function AdminSystemToolsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setStatus(await fetchAdminSystemStatus());
      setLoading(false);
    })();
  }, []);

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
});
