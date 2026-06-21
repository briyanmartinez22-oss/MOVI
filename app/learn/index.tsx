import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/FormUI';
import { MoviLogo } from '../../src/components/MoviLogo';
import { HelpSearchBar } from '../../src/components/help/HelpSearchBar';
import { HELP_SECTIONS } from '../../src/data/helpCenterContent';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function LearnHomeScreen() {
  const router = useRouter();

  const openSection = (sectionId: string) => {
    router.push(`/learn/${sectionId}` as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Aprender MOVI" onBack={() => router.replace('/welcome')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <MoviLogo size="md" />
          <Text style={styles.heroTitle}>Centro de ayuda MOVI</Text>
          <Text style={styles.heroSub}>
            Guía operativa, seguridad, comercios y soporte. Busca por palabra clave o explora las secciones.
          </Text>
        </View>

        <HelpSearchBar />

        <Text style={styles.sectionLabel}>Explorar guías</Text>

        {HELP_SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={styles.card}
            onPress={() => openSection(section.id)}
            activeOpacity={0.85}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={section.icon} size={22} color={colors.brandRed} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardSub}>{section.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  heroTitle: { ...typography.subtitle, color: colors.text, textAlign: 'center' },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  cardSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
