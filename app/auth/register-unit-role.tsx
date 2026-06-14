import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/FormUI';
import { colors, typography, spacing, radius } from '../../src/theme';

const roles = [
  {
    id: 'owner',
    title: 'Dueño',
    desc: 'Registra unidades, conductores y reportes',
    icon: 'business' as const,
    route: '/auth/register-identity' as const,
    params: {
      returnRoute: '/auth/register-owner',
      pendingFlow: 'owner_register',
    },
  },
  {
    id: 'driver',
    title: 'Conductor',
    desc: 'Requiere código de invitación del dueño',
    icon: 'car' as const,
    route: '/auth/register-identity' as const,
    params: {
      returnRoute: '/auth/register-driver-code',
      pendingFlow: 'driver_register',
    },
  },
];

export default function RegisterUnitRoleScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="¿Eres?" onBack={() => router.back()} />
      <Text style={styles.intro}>Operar una unidad en MOVI</Text>
      <View style={styles.content}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={styles.card}
            onPress={() =>
              router.push({ pathname: role.route, params: role.params } as never)
            }
          >
            <View style={styles.iconWrap}>
              <Ionicons name={role.icon} size={24} color={colors.brandBlack} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{role.title}</Text>
              <Text style={styles.desc}>{role.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  intro: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { ...typography.subtitle, color: colors.text },
  desc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
