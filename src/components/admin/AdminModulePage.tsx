import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Card } from '../FormUI';
import { colors, typography, spacing } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  empty?: string;
  children?: React.ReactNode;
  onBack?: () => void;
};

export function AdminModulePage({
  title,
  subtitle,
  loading,
  empty,
  children,
  onBack,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={title} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {loading ? (
          <ActivityIndicator color={colors.brandRed} style={styles.loader} />
        ) : empty ? (
          <Text style={styles.empty}>{empty}</Text>
        ) : (
          children
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AdminListCard({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  loader: { marginTop: spacing.xl },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  card: { marginBottom: spacing.md },
  cardTitle: { ...typography.bodyMedium, color: colors.text, marginBottom: spacing.xs },
  line: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
