import { View, Text, StyleSheet } from 'react-native';
import { PrimaryButton } from '../PrimaryButton';
import { Card, StatusBadge } from '../FormUI';
import { colors, typography, spacing } from '../../theme';
import type { MvpVerificationStatus } from '../../utils/verificationStatus';

export type EntityAction =
  | 'view'
  | 'edit'
  | 'approve'
  | 'reject'
  | 'suspend'
  | 'reactivate'
  | 'resetPassword'
  | 'delete';

type Props = {
  title: string;
  lines: string[];
  mvpStatus?: MvpVerificationStatus | string;
  actions: EntityAction[];
  onAction: (action: EntityAction) => void;
};

const LABELS: Record<EntityAction, string> = {
  view: 'Ver detalle',
  edit: 'Editar',
  approve: 'Aprobar',
  reject: 'Rechazar',
  suspend: 'Suspender',
  reactivate: 'Reactivar',
  resetPassword: 'Reset contraseña',
  delete: 'Eliminar',
};

export function AdminEntityCard({ title, lines, mvpStatus, actions, onAction }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {mvpStatus ? <StatusBadge status={mvpStatus as MvpVerificationStatus} /> : null}
      </View>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
      <View style={styles.actions}>
        {actions.map((action) => (
          <PrimaryButton
            key={action}
            title={LABELS[action]}
            variant={action === 'delete' || action === 'reject' ? 'outline' : 'primary'}
            onPress={() => onAction(action)}
            style={styles.btn}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  line: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  actions: { marginTop: spacing.sm, gap: spacing.xs },
  btn: { marginTop: spacing.xs },
});
