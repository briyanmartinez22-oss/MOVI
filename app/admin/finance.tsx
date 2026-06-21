import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Card } from '../../src/components/FormUI';
import { KpiCard } from '../../src/components/KpiCard';
import {
  fetchFinancePayments,
  fetchFinanceSubscriptions,
  fetchFinanceSummary,
} from '../../src/services/api';
import { useMockApi } from '../../src/services/api/config';
import type { FinanceSummary } from '../../src/types/adminCenter';
import { colors, typography, spacing } from '../../src/theme';

export default function AdminFinanceScreen() {
  const router = useRouter();
  const mockMode = useMockApi();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [s, p, sub] = await Promise.all([
        fetchFinanceSummary(),
        fetchFinancePayments(),
        fetchFinanceSubscriptions(),
      ]);
      setSummary(s ?? null);
      setPayments(p);
      setSubscriptions(sub);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Finanzas" onBack={() => router.replace('/admin')} />
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const svc = summary?.serviceRevenue ?? {};

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Finanzas admin" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          {mockMode || summary?.placeholder
            ? 'Datos simulados — sin procesamiento de pagos real'
            : 'PostgreSQL · agregados reales'}
        </Text>
        {summary?.note ? <Text style={styles.warning}>{summary.note}</Text> : null}

        <View style={styles.grid}>
          <KpiCard label="Hoy USD" value={summary?.revenueTodayUsd ?? 0} />
          <KpiCard label="Mes USD" value={summary?.revenueMonthUsd ?? 0} />
          <KpiCard label="Comisiones" value={summary?.commissionUsd ?? 0} />
          <KpiCard label="Suscripciones" value={summary?.activeSubscriptions ?? 0} />
          <KpiCard label="Pagos fallidos" value={summary?.failedPayments ?? 0} />
          <KpiCard label="Reembolsos" value={summary?.refunds ?? 0} />
          <KpiCard label="MRR" value={summary?.mrr ?? 0} />
          <KpiCard label="ARR" value={summary?.arr ?? 0} />
        </View>

        <Text style={styles.section}>Ingresos por servicio</Text>
        <Card style={styles.block}>
          <Text style={styles.line}>Viajes: ${svc.rides ?? svc.viajes ?? 0}</Text>
          <Text style={styles.line}>Entregas: ${svc.deliveries ?? svc.entregas ?? 0}</Text>
          <Text style={styles.line}>Paquetería: ${svc.packages ?? svc.paqueteria ?? 0}</Text>
          <Text style={styles.line}>Comercios: ${svc.business ?? svc.comercios ?? 0}</Text>
        </Card>

        <Text style={styles.section}>Transacciones ({payments.length})</Text>
        {payments.slice(0, 20).map((p, i) => (
          <Card key={(p.id as string) ?? i} style={styles.rowCard}>
            <Text style={styles.line}>
              {(p.type as string) ?? 'payment'} · ${(p.amount as number) ?? '—'} ·{' '}
              {(p.status as string) ?? '—'}
            </Text>
          </Card>
        ))}
        {payments.length === 0 ? (
          <Text style={styles.muted}>Sin transacciones recientes</Text>
        ) : null}

        <Text style={styles.section}>Suscripciones ({subscriptions.length})</Text>
        {subscriptions.slice(0, 10).map((s, i) => (
          <Card key={(s.id as string) ?? i} style={styles.rowCard}>
            <Text style={styles.line}>
              {(s.plan as string) ?? 'plan'} · {(s.status as string) ?? '—'}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  warning: { ...typography.caption, color: colors.warning, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { ...typography.subtitle, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  block: { padding: spacing.md },
  rowCard: { padding: spacing.md, marginBottom: spacing.xs },
  line: { ...typography.body, color: colors.text },
  muted: { ...typography.caption, color: colors.textMuted },
});
