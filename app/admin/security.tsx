import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Card } from '../../src/components/FormUI';
import { KpiCard } from '../../src/components/KpiCard';
import {
  fetchSecurityEvents,
  fetchSecuritySummary,
  suspendUserApi,
  unsuspendUserApi,
} from '../../src/services/api';
import { useMockApi } from '../../src/services/api/config';
import type { SecuritySummary } from '../../src/types/adminCenter';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function AdminSecurityScreen() {
  const router = useRouter();
  const mockMode = useMockApi();
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [s, e] = await Promise.all([fetchSecuritySummary(), fetchSecurityEvents(30)]);
      setSummary(s ?? null);
      setEvents(e);
      setLoading(false);
    })();
  }, []);

  const handleSuspend = () => {
    if (!userId.trim()) return;
    void suspendUserApi(userId.trim()).then((res) => {
      if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo suspender');
      else Alert.alert('Usuario suspendido');
    });
  };

  const handleUnsuspend = () => {
    if (!userId.trim()) return;
    void unsuspendUserApi(userId.trim()).then((res) => {
      if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo reactivar');
      else Alert.alert('Usuario reactivado');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Seguridad" onBack={() => router.replace('/admin')} />
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Seguridad y riesgo" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          {mockMode ? 'Modo simulación' : 'Eventos y métricas reales'}
        </Text>

        <View style={styles.grid}>
          <KpiCard label="OTP fallidos 24h" value={summary?.otpFailed24h ?? 0} />
          <KpiCard label="Logins sospechosos" value={summary?.suspiciousLogins24h ?? 0} />
          <KpiCard label="Suspendidos" value={summary?.suspendedUsers ?? 0} />
          <KpiCard label="Cancel. altas" value={summary?.highCancelDrivers ?? 0} />
          <KpiCard label="SOS activos" value={summary?.sosActive24h ?? 0} />
          <KpiCard label="Pagos fallidos" value={summary?.failedPayments24h ?? 0} />
          <KpiCard label="Acciones admin" value={summary?.recentAdminActions24h ?? 0} />
        </View>

        <Text style={styles.section}>Suspender / reactivar usuario</Text>
        <Card style={styles.block}>
          <TextInput
            style={styles.input}
            placeholder="userId"
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="none"
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleSuspend}>
              <Text style={styles.btnText}>Suspender</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.okBtn} onPress={handleUnsuspend}>
              <Text style={styles.btnText}>Reactivar</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={styles.section}>Eventos recientes</Text>
        {events.length === 0 ? (
          <Text style={styles.muted}>Sin eventos o endpoint no disponible en mock</Text>
        ) : (
          events.map((ev, i) => (
            <Card key={(ev.id as string) ?? i} style={styles.eventCard}>
              <Text style={styles.line}>{(ev.type as string) ?? 'event'}</Text>
              <Text style={styles.meta}>
                {(ev.message as string) ?? ''} · {(ev.createdAt as string) ?? ''}
              </Text>
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
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { ...typography.subtitle, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  block: { padding: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  dangerBtn: {
    flex: 1,
    backgroundColor: colors.danger,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  okBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { ...typography.body, color: '#fff', fontWeight: '600' },
  eventCard: { padding: spacing.md, marginBottom: spacing.xs },
  line: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  muted: { ...typography.caption, color: colors.textMuted },
});
