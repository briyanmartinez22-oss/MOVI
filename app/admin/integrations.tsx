import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/FormUI';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { fetchAdminSystemStatus, fetchIntegrationsStatus } from '../../src/services/api';
import { typography, spacing, colors } from '../../src/theme';

function Block({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

export default function AdminIntegrationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState<Record<string, unknown> | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [s, i] = await Promise.all([fetchAdminSystemStatus(), fetchIntegrationsStatus()]);
      setSystem(s);
      setIntegrations(i);
      setLoading(false);
    })();
  }, []);

  const db = (system?.database as { status?: string })?.status ?? '—';
  const ws = (system?.websocket as { active?: boolean })?.active ? 'activo' : 'inactivo';
  const otp = (integrations as { otp?: { active?: string } })?.otp?.active ?? '—';
  const maps = (integrations as { maps?: { active?: string } })?.maps?.active ?? '—';
  const storage = (integrations as { storage?: { active?: string } })?.storage?.active ?? '—';

  return (
    <AdminModulePage
      title="Integrations"
      subtitle="Estado OTP, Maps, Cloudinary, DB y WebSocket"
      loading={loading}
      onBack={() => router.replace('/admin')}
    >
      <Block label="Entorno" value={String(system?.environment ?? '—')} />
      <Block label="PostgreSQL" value={db} />
      <Block label="WebSocket /ws" value={ws} />
      <Block label="OTP" value={String(otp)} />
      <Block label="Google Maps" value={String(maps)} />
      <Block label="Cloudinary" value={String(storage)} />
      <Block
        label="Railway"
        value={
          (system?.railway as { detected?: boolean })?.detected
            ? String((system?.railway as { environment?: string })?.environment ?? 'detectado')
            : 'local / no detectado'
        }
      />
    </AdminModulePage>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.xs },
});
