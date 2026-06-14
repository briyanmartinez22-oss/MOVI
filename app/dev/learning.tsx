import { Redirect, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MoviLogo } from '../../src/components/MoviLogo';
import { ScreenHeader } from '../../src/components/FormUI';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import { colors, typography, spacing, radius } from '../../src/theme';

const TOUR_STEPS = [
  { title: 'Registro', route: '/auth/select-role', icon: 'person-add' as const },
  { title: 'Login', route: '/', icon: 'log-in' as const },
  { title: 'Solicitar viaje', route: '/passenger', icon: 'navigate' as const },
  { title: 'Recibir ofertas', route: '/passenger/matching', icon: 'timer' as const },
  { title: 'Elegir conductor', route: '/passenger/offers', icon: 'checkmark-circle' as const },
  { title: 'Seguir viaje', route: '/passenger/trip', icon: 'map' as const },
  { title: 'Historial', route: '/activity', icon: 'time' as const },
  { title: 'Dashboard dueño', route: '/owner/dashboard', icon: 'business' as const },
  { title: 'Dashboard conductor', route: '/driver', icon: 'car' as const },
  { title: 'Verificaciones', route: '/admin/verifications', icon: 'shield-checkmark' as const },
  { title: 'Administración', route: '/admin/verifications', icon: 'settings' as const },
];

export default function LearningModeScreen() {
  const router = useRouter();
  const { handleBack, showFallback, goHome } = useSafeBack();

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Conocer MOVI" onBack={handleBack} showFallback={showFallback} onGoHome={goHome} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <MoviLogo size="md" />
        </View>
        <Text style={styles.intro}>
          Modo aprendizaje: recorre los flujos principales de MOVI. Toca cada paso para abrir la pantalla
          correspondiente (requiere sesión demo según el rol).
        </Text>
        <TouchableOpacity
          style={[styles.card, styles.qaCard]}
          onPress={() => router.push('/dev/qa')}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="flask" size={22} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>QA automático</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.qaCard]}
          onPress={() => router.push('/dev/qa')}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="flask" size={22} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>QA automático</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {TOUR_STEPS.map((step) => (
          <TouchableOpacity
            key={step.title}
            style={styles.card}
            onPress={() => router.push(step.route as never)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{step.title}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  logoWrap: { alignItems: 'center', marginBottom: spacing.sm },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  qaCard: { borderWidth: 1.5, borderColor: colors.primary, marginBottom: spacing.md },
});
