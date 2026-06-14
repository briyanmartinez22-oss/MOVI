import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/FormUI';
import { MoviLogo } from '../../src/components/MoviLogo';
import { BrandTagline } from '../../src/components/BrandTagline';
import { colors, typography, spacing, radius } from '../../src/theme';

const accountPaths = [
  {
    id: 'passenger',
    title: 'Quiero solicitar viajes o entregas',
    desc: 'Pasajero: viajes, comida y paquetería',
    icon: 'person' as const,
    route: '/auth/register-passenger' as const,
  },
  {
    id: 'unit',
    title: 'Quiero operar una unidad',
    desc: 'Dueño de unidad o conductor con invitación',
    icon: 'car-sport' as const,
    route: '/auth/register-unit-role' as const,
  },
  {
    id: 'business',
    title: 'Tengo un negocio y necesito entregas',
    desc: 'Comercio con logística y reparto',
    icon: 'storefront' as const,
    route: '/auth/register-identity' as const,
    params: {
      returnRoute: '/auth/register-business',
      pendingFlow: 'business_register',
    },
  },
];

export default function RegisterAccountScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Crear cuenta" onBack={() => router.replace('/welcome')} />
      <View style={styles.header}>
        <MoviLogo size="md" />
        <BrandTagline variant="secondary" />
        <Text style={styles.question}>¿Qué deseas hacer?</Text>
      </View>
      <View style={styles.content}>
        {accountPaths.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() =>
              router.push(
                item.params
                  ? ({ pathname: item.route, params: item.params } as never)
                  : (item.route as never)
              )
            }
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={24} color={colors.brandRed} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
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
  header: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  question: { ...typography.subtitle, color: colors.text, textAlign: 'center' },
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
  title: { ...typography.bodyMedium, color: colors.text },
  desc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
