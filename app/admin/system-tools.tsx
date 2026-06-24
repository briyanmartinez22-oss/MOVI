import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, PrimaryButton } from '../../src/components';
import { AdminConfirmModal } from '../../src/components/admin/AdminConfirmModal';
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
  const [loadError, setLoadError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [resetFeedback, setResetFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const reload = async () => {
    setLoading(true);
    setLoadError('');
    const statusRes = await fetchAdminSystemStatus();
    const summaryRes = await fetchAdminDataSummary();
    if (!statusRes && !summaryRes) {
      setLoadError('No se pudo cargar el estado del sistema. Verifica permisos SUPER_ADMIN.');
    }
    setStatus(statusRes);
    setSummary(summaryRes);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const runResetBeta = async () => {
    setResetting(true);
    setResetFeedback(null);
    const res = await adminResetBetaPlatform();
    setResetting(false);
    setConfirmOpen(false);

    if (!res.ok) {
      setResetFeedback({
        type: 'error',
        message: res.error ?? 'No se pudo limpiar la plataforma',
      });
      return;
    }

    const total = res.data?.totalDeleted ?? 0;
    const phone = res.data?.superAdminPhone ?? 'SUPER_ADMIN';
    setResetFeedback({
      type: 'success',
      message: `Limpieza completada. ${total} registros eliminados. Conservado: ${phone}.`,
    });
    await reload();
  };

  return (
    <AdminModulePage
      title="System Tools"
      subtitle="Herramientas internas SUPER_ADMIN"
      loading={loading}
      onBack={() => router.replace('/admin')}
    >
      {loadError ? (
        <Card style={styles.feedbackError}>
          <Text style={styles.feedbackErrorText}>{loadError}</Text>
        </Card>
      ) : null}

      {resetFeedback ? (
        <Card
          style={
            resetFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
          }
        >
          <Text
            style={
              resetFeedback.type === 'success'
                ? styles.feedbackSuccessText
                : styles.feedbackErrorText
            }
          >
            {resetFeedback.message}
          </Text>
        </Card>
      ) : null}

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
        onPress={() => setConfirmOpen(true)}
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

      <AdminConfirmModal
        visible={confirmOpen}
        title="Limpiar plataforma"
        message="Eliminará viajes, ofertas, conductores, dueños, vehículos y negocios de prueba. Solo conserva el SUPER_ADMIN. Esta acción no se puede deshacer."
        confirmLabel="Limpiar todo"
        destructive
        loading={resetting}
        onConfirm={() => void runResetBeta()}
        onCancel={() => {
          if (!resetting) setConfirmOpen(false);
        }}
      />
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
  feedbackSuccess: {
    marginBottom: spacing.md,
    backgroundColor: colors.online + '18',
    borderColor: colors.online,
    borderWidth: 1,
  },
  feedbackError: {
    marginBottom: spacing.md,
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  feedbackSuccessText: { ...typography.body, color: colors.online },
  feedbackErrorText: { ...typography.body, color: colors.danger },
});
