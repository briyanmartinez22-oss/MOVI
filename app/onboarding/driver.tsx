import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { MoviLogo } from '../../src/components/MoviLogo';
import { VALUE_PROPOSITION_DRIVER } from '../../src/theme/brand';
import { colors, typography, spacing, radius } from '../../src/theme';

const STEPS = [
  {
    icon: 'wallet' as const,
    title: '100% de tus ganancias',
    desc: 'El precio acordado con el pasajero es tuyo. MOVI no retiene comisión sobre el viaje.',
  },
  {
    icon: 'gift' as const,
    title: 'Primer mes gratis',
    desc: 'Tu suscripción de conductor inicia sin cargo el primer mes. Después, tarifa fija transparente.',
  },
  {
    icon: 'flame' as const,
    title: 'Hotspots y demanda',
    desc: 'Consulta zonas con más solicitudes, conéctate en momentos pico y maximiza tus ingresos.',
  },
];

export default function DriverOnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MoviLogo size="md" />
        <Text style={styles.headline}>Conductor MOVI</Text>
        <Text style={styles.tagline}>{VALUE_PROPOSITION_DRIVER}</Text>
      </View>
      <View style={styles.steps}>
        {STEPS.map((step) => (
          <View key={step.title} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={22} color={colors.brandBlack} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.desc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Ir al panel" onPress={() => router.replace('/driver')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', padding: spacing.lg, gap: spacing.xs },
  headline: { ...typography.hero, fontSize: 26, color: colors.text, marginTop: spacing.sm },
  tagline: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  steps: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { ...typography.bodyMedium, color: colors.text },
  desc: { ...typography.caption, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  footer: { padding: spacing.lg },
});
