import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { filterAdminMenuForRole, type AdminMenuIcon } from '../../config/adminPermissions';
import { useAdminActor } from '../../hooks/useAdminPermission';
import { ADMIN_STAFF_ROLE_LABELS } from '../../types/adminStaff';
import { colors, typography, spacing, radius } from '../../theme';

const ICON_MAP: Record<AdminMenuIcon, keyof typeof Ionicons.glyphMap> = {
  grid: 'grid-outline',
  pulse: 'pulse-outline',
  car: 'car-outline',
  people: 'people-outline',
  person: 'person-outline',
  business: 'business-outline',
  storefront: 'storefront-outline',
  cube: 'cube-outline',
  cash: 'cash-outline',
  card: 'card-outline',
  headset: 'headset-outline',
  shield: 'shield-outline',
  'document-text': 'document-text-outline',
  'bar-chart': 'bar-chart-outline',
  settings: 'settings-outline',
  key: 'key-outline',
  construct: 'construct-outline',
  map: 'map-outline',
  star: 'star-outline',
  'shield-checkmark': 'shield-checkmark-outline',
  'git-network': 'git-network-outline',
};

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { actor } = useAdminActor();
  const items = filterAdminMenuForRole(actor);

  if (actor.staffRole !== 'SUPER_ADMIN') return null;

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>MOVI Admin</Text>
        <Text style={styles.brandRole}>{ADMIN_STAFF_ROLE_LABELS.SUPER_ADMIN}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.menu} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const active =
            pathname === item.route ||
            (item.route !== '/admin' && pathname.startsWith(item.route));
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => router.push(item.route as never)}
            >
              <Ionicons
                name={ICON_MAP[item.icon]}
                size={18}
                color={active ? colors.brandWhite : colors.textSecondary}
              />
              <Text style={[styles.itemText, active && styles.itemTextActive]}>{item.title}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const SIDEBAR_WIDTH = Platform.OS === 'web' ? 248 : 220;

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.primary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing.md,
  },
  brand: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.sm,
  },
  brandTitle: { ...typography.subtitle, color: colors.brandWhite, fontWeight: '700' },
  brandRole: { ...typography.caption, color: colors.brandRed, marginTop: 2, fontWeight: '700' },
  menu: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  itemActive: { backgroundColor: colors.brandRed },
  itemText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  itemTextActive: { color: colors.brandWhite, fontWeight: '600' },
});
