import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  expanded?: boolean;
};

export function BottomCard({ children, expanded = false }: Props) {
  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <View style={styles.handle} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardExpanded: {
    minHeight: 320,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
});
