import { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StarRating, DriverAvatar, PrimaryButton } from '../../src/components';
import { HelpButton } from '../../src/components/HelpButton';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { useTrip } from '../../src/context/TripContext';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function RatingScreen() {
  const router = useRouter();
  const { activeTrip } = useTrip();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const driverName = activeTrip?.acceptedOffer?.driver.name ?? 'tu conductor';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.helpRow}>
        <HelpButton compact />
      </View>
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <Text style={styles.title}>¿Cómo estuvo tu viaje?</Text>
        <Text style={styles.subtitle}>Califica a {driverName.split(' ')[0]}</Text>

        <View style={styles.avatarArea}>
          <DriverAvatar name={driverName} size={80} />
        </View>

        <StarRating rating={rating} onRate={setRating} size={44} />

        <TextInput
          style={styles.commentInput}
          placeholder="Comentario opcional..."
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <Text style={styles.hint}>{FIELD_HINTS.ratingComment}</Text>

        <PrimaryButton
          title="Enviar calificación"
          onPress={() => router.replace('/passenger')}
          disabled={rating === 0}
          style={styles.submitBtn}
        />

        <PrimaryButton
          title="Omitir"
          onPress={() => router.replace('/passenger')}
          variant="outline"
        />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  helpRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  avatarArea: { marginVertical: spacing.xl },
  commentInput: {
    width: '100%',
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    minHeight: 100,
    textAlignVertical: 'top',
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    width: '100%',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  submitBtn: { width: '100%', marginTop: spacing.lg, marginBottom: spacing.md },
});
