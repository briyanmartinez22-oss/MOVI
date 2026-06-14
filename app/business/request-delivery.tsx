import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components';
import { FormInput, ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { useAuth } from '../../src/context/AuthContext';
import { useTrip } from '../../src/context/TripContext';
import { getBusinessByUserId } from '../../src/services/profileData';
import { useMockApi } from '../../src/services/api/config';
import { salvadorPlaces } from '../../src/data/mock';
import type { DeliveryCategory } from '../../src/types';
import { placeFromCoordinates } from '../../src/types/models';
import { colors, typography, spacing } from '../../src/theme';

const CATEGORIES: { id: DeliveryCategory; label: string }[] = [
  { id: 'food', label: 'Comida' },
  { id: 'package', label: 'Paquetería' },
  { id: 'documents', label: 'Documentos' },
  { id: 'shopping', label: 'Compras' },
];

export default function BusinessRequestDelivery() {
  const router = useRouter();
  const { user } = useAuth();
  const business = user ? getBusinessByUserId(user.userId) : null;
  const { setOrigin, setDestination, requestTrip, simulateIncomingOffers } = useTrip();
  const [category, setCategory] = useState<DeliveryCategory>('food');
  const [destLabel, setDestLabel] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!business) {
      setError('Negocio no encontrado');
      return;
    }
    if (!destLabel.trim()) {
      setError('Ingresa dirección o punto de referencia de entrega');
      return;
    }
    const destPlace = salvadorPlaces.find((p) =>
      p.name.toLowerCase().includes(destLabel.toLowerCase().slice(0, 6))
    ) ?? salvadorPlaces[2];

    setOrigin(
      placeFromCoordinates(business.coordinates, business.businessName)
    );
    setDestination({ ...destPlace, name: destLabel.trim() });
    requestTrip(business.userId, business.businessName, {
      kind: 'delivery',
      deliveryCategory: category,
      businessId: business.id,
      businessName: business.businessName,
    });
    if (useMockApi()) {
      setTimeout(() => simulateIncomingOffers(), 800);
    }
    router.push('/business/offers');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Solicitar entrega" />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Los conductores ofertarán. MOVI no cobra comisión por entrega.</Text>
        <Text style={styles.label}>Tipo de entrega</Text>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, category === c.id && styles.chipActive]}
            onPress={() => setCategory(c.id)}
          >
            <Text style={styles.chipText}>{c.label}</Text>
          </TouchableOpacity>
        ))}
        <FormInput
          label="Destino (dirección, lugar o referencia)"
          value={destLabel}
          onChangeText={setDestLabel}
          placeholder="Ej: Colonia Escalón, portón negro"
          multiline
        />
        <Text style={styles.note}>
          Puedes agrupar varias entregas en la misma zona para mayor productividad del conductor.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Buscar conductores" onPress={handleSubmit} />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  hint: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  chip: {
    backgroundColor: colors.borderLight,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.body, color: colors.text },
  note: { ...typography.caption, color: colors.textMuted, marginVertical: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
});
