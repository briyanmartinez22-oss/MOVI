import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, radius } from '../theme';

export function LogoutButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  return (
    <TouchableOpacity
      style={[styles.button, { top: insets.top + spacing.sm }]}
      onPress={handleLogout}
      activeOpacity={0.85}
    >
      <Text style={styles.label}>Cerrar sesión</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 9999,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  label: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
});
