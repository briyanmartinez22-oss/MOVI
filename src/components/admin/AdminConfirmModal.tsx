import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { PrimaryButton } from '../PrimaryButton';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <PrimaryButton
              title="Cancelar"
              variant="outline"
              onPress={onCancel}
              disabled={loading}
              style={styles.btn}
            />
            <PrimaryButton
              title={loading ? 'Procesando…' : confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              disabled={loading}
              style={styles.btn}
            />
          </View>
          {loading ? <ActivityIndicator color={colors.brandRed} style={styles.loader} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  message: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1 },
  loader: { marginTop: spacing.sm },
});
