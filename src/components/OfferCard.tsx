import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Offer } from '../types';
import { formatPrice } from '../utils/pricing';
import { formatEta } from '../utils/geo';
import { DriverAvatar } from './Shared';
import { PrimaryButton } from './PrimaryButton';
import { TukTukBadge } from './TukTukBadge';
import { colors, typography, spacing, radius } from '../theme';

type Props = {
  offer: Offer;
  onAccept: () => void;
};

function RatingDisplay({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);

  return (
    <Text style={styles.rating}>
      {stars} {rating.toFixed(1)}
    </Text>
  );
}

export function OfferCard({ offer, onAccept }: Props) {
  const { driver } = offer;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <DriverAvatar name={driver.name} size={52} photoUrl={driver.photoUrl} />
        <View style={styles.info}>
          <Text style={styles.name}>{driver.name}</Text>
          <Text style={styles.meta}>{driver.unit}</Text>
          <Text style={styles.meta}>Placa {driver.plate}</Text>
          {driver.vehicleType ? (
            <Text style={styles.meta}>Tipo: {driver.vehicleType.replace(/_/g, ' ')}</Text>
          ) : null}
          <Text style={styles.association}>{driver.association}</Text>
          <RatingDisplay rating={driver.rating} />
        </View>
      </View>

      <TukTukBadge compact />

      <View style={styles.etaRow}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.eta}>Llega en {formatEta(offer.etaMinutes)}</Text>
      </View>

      <View style={styles.offerBox}>
        <Text style={styles.offerLabel}>Oferta</Text>
        <Text style={styles.offerPrice}>{formatPrice(offer.price)}</Text>
      </View>

      <PrimaryButton title="Aceptar oferta" onPress={onAccept} />
    </View>
  );
}

export function DriverProfileCard({
  name,
  unit,
  plate,
  association,
  rating,
  etaMinutes,
  price,
}: {
  name: string;
  unit: string;
  plate: string;
  association: string;
  rating: number;
  etaMinutes?: number;
  price?: number;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <DriverAvatar name={name} size={64} />
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{unit}</Text>
          <Text style={styles.meta}>Placa {plate}</Text>
          <Text style={styles.association}>{association}</Text>
          <RatingDisplay rating={rating} />
        </View>
      </View>
      <TukTukBadge compact />
      {etaMinutes !== undefined && (
        <View style={styles.etaRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.eta}>Llega en {formatEta(etaMinutes)}</Text>
        </View>
      )}
      {price !== undefined && (
        <View style={styles.offerBox}>
          <Text style={styles.offerLabel}>Precio aceptado</Text>
          <Text style={styles.offerPrice}>{formatPrice(price)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  association: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  rating: {
    ...typography.caption,
    color: colors.star,
    marginTop: 4,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eta: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  offerBox: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  offerLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  offerPrice: {
    ...typography.price,
    color: colors.text,
    marginTop: 4,
  },
});
