import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { KpiCard } from '../../src/components/KpiCard';
import { fetchAdminRatingsList } from '../../src/services/api';
import type { AdminRatingRecord } from '../../src/types/adminUsers';
import { colors, typography, spacing } from '../../src/theme';

function Stars({ value }: { value: number }) {
  return <Text style={styles.stars}>{'★'.repeat(value)}{'☆'.repeat(5 - value)}</Text>;
}

export default function AdminRatingsScreen() {
  const router = useRouter();
  const [ratings, setRatings] = useState<AdminRatingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminRatingsList(100);
    setRatings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    if (ratings.length === 0) return { average: 0, count: 0, low: 0 };
    const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
    return {
      average: Math.round((sum / ratings.length) * 10) / 10,
      count: ratings.length,
      low: ratings.filter((r) => r.stars <= 2).length,
    };
  }, [ratings]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Calificaciones" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>Calificaciones de viajes · PostgreSQL</Text>
        <View style={styles.grid}>
          <KpiCard label="Promedio" value={summary.average || '—'} />
          <KpiCard label="Total" value={summary.count} />
          <KpiCard label="≤ 2 estrellas" value={summary.low} />
        </View>
        {loading ? (
          <ActivityIndicator color={colors.brandRed} style={styles.loader} />
        ) : ratings.length === 0 ? (
          <Text style={styles.empty}>Sin calificaciones todavía</Text>
        ) : (
          ratings.map((r) => (
            <Card key={r.id} style={styles.item}>
              <View style={styles.row}>
                <Stars value={r.stars} />
                <Text style={styles.date}>
                  {new Date(r.createdAt).toLocaleDateString('es-SV')}
                </Text>
              </View>
              <Text style={styles.meta}>
                {r.raterName} ({r.raterRole}) → {r.rateeName} ({r.rateeRole})
              </Text>
              <Text style={styles.meta}>Viaje: {r.tripId.slice(0, 12)}…</Text>
              {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  loader: { marginTop: spacing.xl },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  item: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stars: { color: colors.brandRed, fontSize: 16, letterSpacing: 1 },
  date: { ...typography.caption, color: colors.textMuted },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  comment: { ...typography.body, color: colors.text, marginTop: spacing.sm, fontStyle: 'italic' },
});
