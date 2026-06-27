import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ExecutiveKpiGrid } from '../../src/components/admin/ExecutiveKpiGrid';
import { useAdminActor } from '../../src/hooks/useAdminPermission';
import { canAccess } from '../../src/config/adminPermissions';
import { ADMIN_STAFF_ROLE_LABELS } from '../../src/types/adminStaff';
import { colors, typography, spacing, radius } from '../../src/theme';

type QuickAction = {
  label: string;
  icon: string;
  route: string;
  badge?: string;
  permission: Parameters<typeof canAccess>[1];
  danger?: boolean;
};

type DashSection = {
  title: string;
  icon: string;
  color: string;
  actions: QuickAction[];
  permission: Parameters<typeof canAccess>[1];
};

const SECTIONS: DashSection[] = [
  {
    title: 'Operaciones',
    icon: 'pulse',
    color: '#01696f',
    permission: 'trips.view_all',
    actions: [
      { label: 'En vivo', icon: 'radio', route: '/admin/operations-live', permission: 'trips.tracking' },
      { label: 'Viajes', icon: 'car', route: '/admin/trips', permission: 'trips.view_all' },
      { label: 'Entregas', icon: 'cube', route: '/admin/deliveries', permission: 'deliveries.reassign' },
      { label: 'Mapa', icon: 'map', route: '/admin/operations', permission: 'trips.tracking' },
    ],
  },
  {
    title: 'Verificaciones',
    icon: 'shield-checkmark',
    color: '#964219',
    permission: 'drivers.approve',
    actions: [
      { label: 'Pendientes', icon: 'hourglass', route: '/admin/verifications', permission: 'drivers.approve' },
      { label: 'Conductores', icon: 'person', route: '/admin/drivers', permission: 'drivers.view' },
      { label: 'Dueños', icon: 'business', route: '/admin/owners', permission: 'owners.view' },
      { label: 'Vehículos', icon: 'car-sport', route: '/admin/vehicles', permission: 'owners.fleet' },
      { label: 'Invitaciones', icon: 'key', route: '/admin/vehicle-invites', permission: 'owners.fleet' },
    ],
  },
  {
    title: 'Usuarios',
    icon: 'people',
    color: '#006494',
    permission: 'passengers.view',
    actions: [
      { label: 'Pasajeros', icon: 'people', route: '/admin/passengers', permission: 'passengers.view' },
      { label: 'Negocios', icon: 'storefront', route: '/admin/businesses', permission: 'businesses.view' },
      { label: 'Proveedores', icon: 'git-network', route: '/admin/providers', permission: 'owners.view' },
      { label: 'Calificaciones', icon: 'star', route: '/admin/ratings', permission: 'passengers.ratings' },
    ],
  },
  {
    title: 'Finanzas',
    icon: 'cash',
    color: '#437a22',
    permission: 'finance.transactions',
    actions: [
      { label: 'Transacciones', icon: 'cash', route: '/admin/finance', permission: 'finance.transactions' },
      { label: 'Suscripciones', icon: 'card', route: '/admin/subscriptions', permission: 'finance.subscriptions' },
      { label: 'Analítica', icon: 'bar-chart', route: '/admin/analytics', permission: 'analytics.full' },
    ],
  },
  {
    title: 'Soporte',
    icon: 'headset',
    color: '#7a39bb',
    permission: 'support.tickets_view',
    actions: [
      { label: 'Tickets', icon: 'headset', route: '/admin/support', permission: 'support.tickets_view' },
      { label: 'Seguridad', icon: 'shield', route: '/admin/security', permission: 'security.events' },
      { label: 'Auditoría', icon: 'document-text', route: '/admin/audit', permission: 'security.audit' },
    ],
  },
  {
    title: 'Sistema',
    icon: 'construct',
    color: '#a13544',
    permission: 'config.global',
    actions: [
      { label: 'Admins', icon: 'people-circle', route: '/admin/admins', permission: 'admin.create' },
      { label: 'Configuración', icon: 'settings', route: '/admin/settings', permission: 'config.global' },
      { label: 'Integraciones', icon: 'git-network', route: '/admin/integrations', permission: 'system.integrations' },
      { label: 'Herramientas', icon: 'construct', route: '/admin/system-tools', permission: 'system.internal_tools' },
    ],
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { actor } = useAdminActor();

  const visibleSections = SECTIONS.filter((s) => canAccess(actor, s.permission));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Panel MOVI</Text>
          {actor.staffRole ? (
            <View style={styles.rolePill}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>
                {ADMIN_STAFF_ROLE_LABELS[actor.staffRole] ?? actor.staffRole}
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.liveBtn}
          onPress={() => router.push('/admin/operations-live' as never)}
        >
          <View style={styles.liveDot} />
          <Text style={styles.liveBtnText}>En vivo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ExecutiveKpiGrid />

        {visibleSections.map((section) => {
          const visibleActions = section.actions.filter((a) => canAccess(actor, a.permission));
          if (visibleActions.length === 0) return null;
          return (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: section.color + '18' }]}>
                  <Ionicons name={section.icon as never} size={18} color={section.color} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.grid}>
                {visibleActions.map((action) => (
                  <TouchableOpacity
                    key={action.route}
                    style={[styles.actionCard, action.danger && styles.actionCardDanger]}
                    onPress={() => router.push(action.route as never)}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: section.color + '15' }]}>
                      <Ionicons name={action.icon as never} size={22} color={action.danger ? colors.danger : section.color} />
                    </View>
                    <Text
                      style={[styles.actionLabel, action.danger && { color: colors.danger }]}
                      numberOfLines={2}
                    >
                      {action.label}
                    </Text>
                    {action.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{action.badge}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        {canAccess(actor, 'system.railway') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#a1354415' }]}>
                <Ionicons name="warning" size={18} color={colors.danger} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.danger }]}>Acciones críticas</Text>
            </View>
            <View style={styles.grid}>
              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardDanger]}
                onPress={() => router.push('/admin/system-tools' as never)}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.danger + '18' }]}>
                  <Ionicons name="server" size={22} color={colors.danger} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>Railway / DB</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardDanger]}
                onPress={() => router.push('/admin/security' as never)}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.danger + '18' }]}>
                  <Ionicons name="ban" size={22} color={colors.danger} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>Revocar admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardDanger]}
                onPress={() => router.push('/admin/admins' as never)}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.danger + '18' }]}>
                  <Ionicons name="person-add" size={22} color={colors.danger} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>Crear admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_SIZE = '30%';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerTitle: { ...typography.subtitle, color: colors.text, fontWeight: '700' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  roleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brandRed },
  roleText: { ...typography.caption, color: colors.brandRed, fontWeight: '700', letterSpacing: 0.4 },
  liveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#22c55e18', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  liveBtnText: { ...typography.caption, color: '#22c55e', fontWeight: '700' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...typography.subtitle, color: colors.text, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    width: CARD_SIZE, minWidth: 90,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs, position: 'relative',
  },
  actionCardDanger: { borderWidth: 1, borderColor: '#a1354430' },
  actionIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionLabel: { ...typography.caption, color: colors.text, textAlign: 'center', fontWeight: '600', lineHeight: 14 },
  badge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: colors.brandRed, borderRadius: radius.full,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  badgeText: { ...typography.caption, color: colors.brandWhite, fontSize: 9, fontWeight: '700' },
});
