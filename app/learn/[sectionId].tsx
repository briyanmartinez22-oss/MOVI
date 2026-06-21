import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/FormUI';
import { HelpArticleBlocks } from '../../src/components/help/HelpArticleBlocks';
import { HelpSupportPanel } from '../../src/components/help/HelpSupportPanel';
import { getHelpSection } from '../../src/data/helpCenterContent';
import { trackHelpArticleOpened } from '../../src/services/helpAnalytics';
import { colors, typography, spacing } from '../../src/theme';

export default function LearnSectionScreen() {
  const router = useRouter();
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const section = getHelpSection(sectionId ?? '');

  useEffect(() => {
    if (section) {
      void trackHelpArticleOpened(section.id);
    }
  }, [section?.id]);

  if (!section) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Sección no encontrada" onBack={() => router.back()} />
        <Text style={[styles.paragraph, styles.missing]}>No encontramos esta sección de ayuda.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={section.title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>{section.subtitle}</Text>
        <HelpArticleBlocks blocks={section.blocks} />
        {section.id === 'support' ? <HelpSupportPanel /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  subtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  paragraph: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  missing: { padding: spacing.lg },
});
