import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import {
  getOwnerByUserId,
  getOwnerDrivers,
  getOwnerDashboardStats,
  getOwnerSessions,
} from '../../src/services/profileData';
import { getOwnerFlowPhase, MOVI_FLOW_LABELS, ownerMustCompleteOnboarding } from '../../src/domain/moviFlow';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function OwnerDashboard() {
  const router = useRouter();
  const { user, getDailySessionSummary } = useAuth();
  const { loading, error } = useProfileBootstrap('owner');
  const owner = user ? getOwnerByUserId(user.userId) : null;

  if (loading) return <BrandedLoadingView message="Cargando…" />;

  if (!owner) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Inicio" />
        <View style={styles.emptyState}>
          <Ionicons name="person-add-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Completa tu registro</Text>
          <Text style={styles.emptyDesc}>Necesitas completar tu perfil de dueño para continuar.</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/auth/register-owner' as never)}
          >
            <Text style={styles.emptyBtnText}>Completar registro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const drivers = getOwnerDrivers(owner.id);
  const sessions = getOwnerSessions(owner.id);
  const stats = getOwnerDashboardStats(owner.id);
  const activeDrivers = drivers.filter((d) =>
    sessions.some((s) => s.driverId === d.id && !s.disconnectedAt)
  );
  const todayIncome = stats?.income ?? 0;
  const todayTrips = stats?.trips ?? 0;
  const todayKm = stats?.kilometers ?? 0;

  const flowPhase = getOwnerFlowPhase(owner.status);
  const statusColor =
    flowPhase === 'approved' ? colors.success
    : flowPhase === 'blocked' ? colors.danger
    : flowPhase === 'submitted' ? colors.warning
    : colors.textSecondary;
  const statusLabel = MOVI_FLOW_LABELS[flowPhase];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`Hola, ${owner.name.split(' ')[0] ?? owner.name}`} />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {ownerMustCompleteOnboarding(owner.status) ? (
          <TouchableOpacity style={styles.onboardingBanner} onPress={() => router.push('/owner/account' as never)}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.onboardingTitle}>Completa tu verificación</Text>
              <Text style={styles.onboardingDesc}>
                Debes terminar tu perfil, foto y documentos antes de operar con MOVI.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>

        <Text style={styles.sectionTitle}>Hoy</Text>
        <View style={styles.statsRow}>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>${todayIncome.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Cobrado</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{todayTrips}</Text>
            <Text style={styles.statLabel}>Viajes</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{todayKm.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Km</Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Conductores activos ({activeDrivers.length})</Text>
        {activeDrivers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Ningún conductor en línea ahora</Text>
          </Card>
        ) : (
          activeDrivers.map((driver) => {
            const summary = getDailySessionSummary(driver.id);
            return (
              <Card key={driver.id} style={styles.driverCard}>
                <View style={styles.driverRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.driverName}>{driver.name}</Text>
                </View>
                <Text style={styles.driverStats}>
                  ${summary.totalCashCollected.toFixed(2)} · {summary.totalTrips} viajes hoy
                </Text>
              </Card>
            );
          })
        )}

        <TouchableOpacity
          style={styles.activityBtn}
          onPress={() => router.push('/activity' as never)}
        >
          <Ionicons name="pulse-outline" size={20} color={colors.primary} />
          <Text style={styles.activityBtnText}>Ver actividad en vivo</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.caption, color: colors.textSecondary },
  onboardingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  onboardingTitle: { ...typography.bodyMedium, color: colors.text },
  onboardingDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.subtitle, color: colors.text },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statValue: { ...typography.subtitle, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  driverCard: { gap: spacing.xs },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  driverName: { ...typography.bodyMedium, color: colors.text },
  driverStats: { ...typography.caption, color: colors.textSecondary },
  activityBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.md, marginTop: spacing.sm,
  },
  activityBtnText: { ...typography.body, color: colors.primary, flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { ...typography.subtitle, color: colors.text },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  emptyBtnText: { ...typography.bodyMedium, color: colors.brandWhite },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyCardText: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger },
});
