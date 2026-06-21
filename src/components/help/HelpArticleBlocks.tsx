import { View, Text, StyleSheet } from 'react-native';
import type { HelpBlock } from '../../data/helpCenterContent';
import { HelpStepGuide } from './HelpStepGuide';
import { colors, typography, spacing } from '../../theme';

export function HelpArticleBlocks({ blocks }: { blocks: HelpBlock[] }) {
  return (
    <View style={styles.wrap}>
      {blocks.map((block, index) => (
        <HelpBlockView key={`block-${index}`} block={block} />
      ))}
    </View>
  );
}

function HelpBlockView({ block }: { block: HelpBlock }) {
  if (block.type === 'heading') {
    return <Text style={styles.heading}>{block.text}</Text>;
  }
  if (block.type === 'paragraph') {
    return <Text style={styles.paragraph}>{block.text}</Text>;
  }
  if (block.type === 'steps') {
    return <HelpStepGuide steps={block.steps} />;
  }
  return (
    <View style={styles.bulletList}>
      {block.items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  heading: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.sm },
  paragraph: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  bulletList: { gap: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: { ...typography.body, color: colors.brandRed, lineHeight: 22 },
  bulletText: { ...typography.body, color: colors.textSecondary, flex: 1, lineHeight: 22 },
});
