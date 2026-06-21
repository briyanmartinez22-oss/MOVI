import { Alert, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { getHelpForRoute } from '../data/screenHelp';
import { resolveHelpSectionForRoute } from '../data/helpContextMap';
import type { HelpSectionId } from '../data/helpCenterContent';
import { useHelpVisibility } from '../context/HelpVisibilityContext';
import { trackHelpArticleOpened } from '../services/helpAnalytics';
import { colors, typography } from '../theme';

type Props = {
  helpText?: string;
  sectionId?: HelpSectionId;
  compact?: boolean;
};

export function HelpButton({ helpText, sectionId, compact = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { visible, hide } = useHelpVisibility();

  if (!visible) return null;

  const targetSection = sectionId ?? resolveHelpSectionForRoute(pathname);

  const showHelp = () => {
    if (targetSection && !helpText) {
      void trackHelpArticleOpened(targetSection);
      router.push(`/learn/${targetSection}` as never);
      return;
    }

    Alert.alert('TUTOR MOVI', helpText ?? getHelpForRoute(pathname), [
      { text: 'Cerrar', style: 'cancel' },
      {
        text: 'Ocultar ayuda',
        onPress: hide,
      },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={showHelp}
      onLongPress={hide}
      delayLongPress={400}
      style={[styles.btn, compact && styles.btnCompact]}
      accessibilityLabel="¿Necesitas ayuda?"
      accessibilityHint="Mantén presionado para ocultar el botón de ayuda"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.icon, compact && styles.iconCompact]}>?</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  icon: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
  },
  iconCompact: {
    fontSize: 15,
  },
});
