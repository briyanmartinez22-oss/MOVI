import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HELP_SUPPORT_CHANNELS } from '../../data/helpCenterContent';
import type { HelpContextEntry } from '../../data/helpContextDetails';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  context: HelpContextEntry;
  onClose: () => void;
};

export function MoviHelpModal({ visible, context, onClose }: Props) {
  const router = useRouter();

  const openGuide = () => {
    onClose();
    router.push(`/learn/${context.sectionId}` as never);
  };

  const contactSupport = () => {
    const whatsapp = HELP_SUPPORT_CHANNELS.find((c) => c.id === 'whatsapp');
    if (whatsapp?.value) {
      void Linking.openURL(`https://wa.me/${whatsapp.value.replace(/\D/g, '')}`);
    } else {
      router.push('/learn/support' as never);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{context.title}</Text>
          <Text style={styles.summary}>{context.summary}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={openGuide}>
            <Ionicons name="book-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>Ver guía completa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={contactSupport}>
            <Ionicons name="headset-outline" size={18} color={colors.text} />
            <Text style={styles.secondaryText}>Contactar soporte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  summary: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  primaryText: { ...typography.body, color: colors.primaryText, fontWeight: '600' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  secondaryText: { ...typography.body, color: colors.text },
  closeBtn: { alignItems: 'center', padding: spacing.md },
  closeText: { ...typography.body, color: colors.textMuted },
});
