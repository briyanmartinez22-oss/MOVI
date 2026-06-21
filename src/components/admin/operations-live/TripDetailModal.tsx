import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { StatusBadge } from '../../FormUI';
import type { TripRequest } from '../../../types';
import { colors, typography, spacing, radius } from '../../../theme';

type Props = {
  visible: boolean;
  trip: TripRequest | null;
  onClose: () => void;
};

export function TripDetailModal({ visible, trip, onClose }: Props) {
  if (!trip) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Detalle del viaje</Text>
          <ScrollView style={styles.scroll}>
            <View style={styles.row}>
              <Text style={styles.label}>Pasajero</Text>
              <Text style={styles.value}>{trip.passengerName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Estado</Text>
              <StatusBadge status={trip.lifecycleStatus} />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Origen</Text>
              <Text style={styles.value}>{trip.origin.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Destino</Text>
              <Text style={styles.value}>{trip.destination.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Distancia</Text>
              <Text style={styles.value}>{trip.distanceKm} km</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Ofertas</Text>
              <Text style={styles.value}>{trip.offers.length}</Text>
            </View>
            {trip.acceptedOffer ? (
              <View style={styles.row}>
                <Text style={styles.label}>Conductor</Text>
                <Text style={styles.value}>
                  {trip.acceptedOffer.driver.name} · ${trip.acceptedOffer.price.toFixed(2)}
                </Text>
              </View>
            ) : null}
            {trip.description ? (
              <View style={styles.row}>
                <Text style={styles.label}>Notas</Text>
                <Text style={styles.value}>{trip.description}</Text>
              </View>
            ) : null}
            <Text style={styles.section}>Ofertas recibidas</Text>
            {trip.offers.length === 0 ? (
              <Text style={styles.muted}>Sin ofertas</Text>
            ) : (
              trip.offers.map((offer) => (
                <Text key={offer.id} style={styles.offerLine}>
                  {offer.driver.name}: ${offer.price.toFixed(2)} · {offer.status}
                </Text>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md },
  scroll: { marginBottom: spacing.md },
  row: { marginBottom: spacing.sm },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.body, color: colors.text, marginTop: 2 },
  section: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  muted: { ...typography.caption, color: colors.textSecondary },
  offerLine: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  closeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  closeText: { ...typography.bodyMedium, color: colors.primaryText },
});
