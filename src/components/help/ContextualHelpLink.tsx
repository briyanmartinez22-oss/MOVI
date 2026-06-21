import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resolveHelpSectionForRoute } from '../../data/helpContextMap';
import type { HelpSectionId } from '../../data/helpCenterContent';
import { trackHelpArticleOpened } from '../../services/helpAnalytics';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  sectionId?: HelpSectionId;
  compact?: boolean;
};

export function ContextualHelpLink({ sectionId, compact = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const target = sectionId ?? resolveHelpSectionForRoute(pathname);

  if (!target) return null;

  const openHelp = () => {
    void trackHelpArticleOpened(target);
    router.push(`/learn/${target}` as never);
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={openHelp}
        style={styles.compactBtn}
        accessibilityLabel="¿Necesitas ayuda?"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="help-circle-outline" size={22} color={colors.brandRed} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.link} onPress={openHelp} activeOpacity={0.85}>
      <Ionicons name="help-circle-outline" size={18} color={colors.brandRed} />
      <Text style={styles.linkText}>¿Necesitas ayuda?</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
  },
  linkText: { ...typography.caption, color: colors.brandRed, fontWeight: '600' },
  compactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
});
