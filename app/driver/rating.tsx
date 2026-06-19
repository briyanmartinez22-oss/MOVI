import { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StarRating, PrimaryButton } from '../../src/components';
import { ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { useTrip } from '../../src/context/TripContext';
import { submitTripRating } from '../../src/services/ratingService';
import { showSuccess } from '../../src/utils/feedback';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function DriverRatingScreen() {
  const router = useRouter();
  const { activeTrip } = useTrip();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passengerName = activeTrip?.passengerName ?? 'el pasajero';

  const handleSubmit = async () => {
    if (!activeTrip || rating === 0) return;
    setSubmitting(true);
    const res = await submitTripRating({
      tripId: activeTrip.id,
      stars: rating,
      comment,
      raterRole: 'driver',
    });
    setSubmitting(false);
    if (res.ok) {
      showSuccess('Calificación enviada');
      router.replace('/driver');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Calificar pasajero" onBack={() => router.replace('/driver')} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <Text style={styles.title}>¿Cómo fue el viaje con {passengerName.split(' ')[0]}?</Text>
        <StarRating rating={rating} onRate={setRating} size={44} />
        <TextInput
          style={styles.commentInput}
          placeholder="Comentario opcional..."
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <PrimaryButton
          title="Enviar calificación"
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
          style={styles.submitBtn}
        />
        <PrimaryButton title="Omitir" onPress={() => router.replace('/driver')} variant="outline" />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { flexGrow: 1, padding: spacing.lg, alignItems: 'center' },
  title: { ...typography.title, color: colors.text, textAlign: 'center', marginBottom: spacing.xl },
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
  submitBtn: { width: '100%', marginTop: spacing.lg, marginBottom: spacing.md },
});
