import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/FormUI';
import { ExecutiveKpiGrid } from '../../src/components/admin/ExecutiveKpiGrid';
import { DashboardSections } from '../../src/components/admin/DashboardSections';
import { MoviLogo } from '../../src/components/MoviLogo';
import { BrandTagline } from '../../src/components/BrandTagline';
import { filterAdminMenuForRole } from '../../src/config/adminPermissions';
import { useAdminStaffRole } from '../../src/hooks/useAdminStaffRole';
import { ADMIN_STAFF_ROLE_LABELS } from '../../src/types/adminStaff';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function AdminDashboard() {
  const router = useRouter();
  const { staffRole } = useAdminStaffRole();
  const links = staffRole ? filterAdminMenuForRole(staffRole) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Admin MOVI" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoRow}>
          <MoviLogo size="md" />
        </View>
        <BrandTagline variant="primary" />
        {staffRole ? (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ADMIN_STAFF_ROLE_LABELS[staffRole]}</Text>
          </View>
        ) : null}
        <Text style={styles.section}>Dashboard ejecutivo</Text>
        <ExecutiveKpiGrid />
        <DashboardSections />

        {links.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => router.push(item.route as never)}
          >
            <Ionicons name={item.icon} size={22} color={colors.text} />
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  logoRow: { alignItems: 'center', marginBottom: spacing.md },
  roleBadge: {
    alignSelf: 'center',
    backgroundColor: colors.brandRed,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  roleText: {
    ...typography.caption,
    color: colors.brandWhite,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  menuText: { ...typography.body, color: colors.text, flex: 1 },
});
