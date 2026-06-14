import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setMeetingShare } from '../services/meetingService';
import { useTrip } from '../context/TripContext';
import { colors, typography, spacing, radius } from '../theme';

type Props = {
  tripId: string;
  driverId: string;
};

export function MeetingFacilitation({ tripId, driverId }: Props) {
  const { origin } = useTrip();
  const [description, setDescription] = useState('');
  const [photoShared, setPhotoShared] = useState(false);
  const [descriptionShared, setDescriptionShared] = useState(false);
  const [comboShared, setComboShared] = useState(false);
  const [liveShared, setLiveShared] = useState(false);

  const sharePhoto = () => {
    setMeetingShare(tripId, driverId, {
      photoUri: `mock://meeting-photo-${Date.now()}`,
    });
    setPhotoShared(true);
    Alert.alert(
      'Foto compartida',
      'Solo el conductor asignado puede verla. Se elimina al finalizar el viaje (no se guarda en el dispositivo).'
    );
  };

  const shareDescription = () => {
    if (!description.trim()) {
      Alert.alert('Descripción vacía', 'Escribe cómo identificarte en el punto de encuentro.');
      return;
    }
    setMeetingShare(tripId, driverId, { description: description.trim() });
    setDescriptionShared(true);
    Alert.alert('Descripción enviada', 'El conductor verá tu mensaje en el viaje activo.');
  };

  const sharePhotoAndDescription = () => {
    if (!description.trim()) {
      Alert.alert('Descripción vacía', 'Escribe cómo identificarte junto con la foto.');
      return;
    }
    setMeetingShare(tripId, driverId, {
      photoUri: `mock://meeting-photo-${Date.now()}`,
      description: description.trim(),
    });
    setPhotoShared(true);
    setDescriptionShared(true);
    setComboShared(true);
    Alert.alert(
      'Foto y descripción enviadas',
      'El conductor verá ambos datos de forma temporal hasta que termine el viaje.'
    );
  };

  const shareLiveLocation = () => {
    setMeetingShare(tripId, driverId, { liveLocation: origin.coordinates });
    setLiveShared(true);
    Alert.alert('Ubicación compartida', 'El conductor verá tu ubicación en vivo durante este viaje.');
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Facilitar encuentro</Text>
      <Text style={styles.subtitle}>
        Opcional: foto, descripción, ambos o ubicación en vivo. Nada se guarda permanentemente.
      </Text>

      <TouchableOpacity style={styles.option} onPress={sharePhoto}>
        <Ionicons name="camera-outline" size={20} color={colors.primary} />
        <Text style={styles.optionText}>
          {photoShared && !comboShared ? 'Foto temporal compartida ✓' : 'Compartir foto temporal'}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Ej: Frente a la farmacia, camisa roja"
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TouchableOpacity style={styles.option} onPress={shareDescription}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
        <Text style={styles.optionText}>
          {descriptionShared && !comboShared ? 'Descripción enviada ✓' : 'Compartir descripción'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={sharePhotoAndDescription}>
        <Ionicons name="images-outline" size={20} color={colors.primary} />
        <Text style={styles.optionText}>
          {comboShared ? 'Foto + descripción enviadas ✓' : 'Compartir foto y descripción'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={shareLiveLocation}>
        <Ionicons name="locate-outline" size={20} color={colors.primary} />
        <Text style={styles.optionText}>
          {liveShared ? 'Ubicación en vivo activa ✓' : 'Compartir ubicación en vivo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.bodyMedium, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  optionText: { ...typography.body, color: colors.text, flex: 1 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    minHeight: 56,
    textAlignVertical: 'top',
  },
});
