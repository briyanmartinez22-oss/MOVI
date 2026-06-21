import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { usePathname } from 'expo-router';
import { canAccessAdminRoute } from '../../config/adminPermissions';
import { useAdminActor } from '../../hooks/useAdminPermission';
import { colors, typography, spacing } from '../../theme';

type Props = {
  children: React.ReactNode;
};

export function AdminUnauthorized() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Acceso no autorizado</Text>
      <Text style={styles.body}>
        Tu rol de administrador no tiene permiso para esta sección. Si necesitas acceso, contacta a un
        SUPER ADMIN.
      </Text>
    </View>
  );
}

export function AdminRouteGuard({ children }: Props) {
  const pathname = usePathname();
  const { actor, loading } = useAdminActor();

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!actor.staffRole || !canAccessAdminRoute(pathname, actor)) {
    return <AdminUnauthorized />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
