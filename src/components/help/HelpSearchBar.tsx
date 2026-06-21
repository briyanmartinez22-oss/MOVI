import { useMemo, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchHelpArticles, type HelpSearchResult } from '../../services/helpSearch';
import { trackHelpSearch } from '../../services/helpAnalytics';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  onResultPress?: (result: HelpSearchResult) => void;
};

export function HelpSearchBar({ onResultPress }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchHelpArticles(query), [query]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim().length >= 2) {
      void trackHelpSearch(value);
    }
  };

  const openResult = (result: HelpSearchResult) => {
    onResultPress?.(result);
    router.push(`/learn/${result.sectionId}` as never);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={handleChange}
          placeholder="Buscar: otp, conductor, cancelar viaje..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {query.trim().length >= 2 ? (
        results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.sectionId}
            scrollEnabled={false}
            style={styles.results}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultRow} onPress={() => openResult(item)}>
                <View style={styles.resultBody}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultSub}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text style={styles.empty}>Sin resultados para “{query.trim()}”</Text>
        )
      ) : (
        <Text style={styles.hint}>Prueba: otp, conductor, documentos, paquetería</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.xs },
  hint: { ...typography.caption, color: colors.textMuted },
  empty: { ...typography.caption, color: colors.textSecondary },
  results: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  resultBody: { flex: 1 },
  resultTitle: { ...typography.bodyMedium, color: colors.text },
  resultSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
