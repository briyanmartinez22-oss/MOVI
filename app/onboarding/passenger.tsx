import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { MoviLogo } from '../../src/components/MoviLogo';
import { colors, typography, spacing, radius } from '../../src/theme';

const STEPS = [
  {
    icon: 'hand-right' as const,
    title: 'Bienvenido a MOVI',
    desc: 'Tu plataforma para moverte y recibir entregas al mejor precio.',
  },
  {
    icon: 'navigate' as const,
    title: 'Solicita viajes',
    desc: 'Indica origen y destino; mototaxi, comida, mensajería o paquetería.',
  },
  {
    icon: 'git-compare' as const,
    title: 'Compara ofertas',
    desc: 'Los conductores compiten por tu viaje. Tú ves precio, tiempo y reputación.',
  },
  {
    icon: 'star' as const,
    title: 'Elige la mejor',
    desc: 'Selecciona la oferta que prefieras y disfruta el trayecto con seguimiento en vivo.',
  },
];

export default function PassengerOnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MoviLogo size="md" />
        <Text style={styles.headline}>¡Bienvenido!</Text>
      </View>
      <View style={styles.steps}>
        {STEPS.map((step) => (
          <View key={step.title} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={22} color={colors.brandRed} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.desc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Empezar" onPress={() => router.replace('/passenger')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  headline: { ...typography.hero, fontSize: 28, color: colors.text },
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
