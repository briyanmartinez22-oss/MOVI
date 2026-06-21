import { View, Text, StyleSheet } from 'react-native';
import { Card } from './FormUI';
import { formatPrice } from '../utils/pricing';
import { formatDate } from '../services/profileData';
import type { TripHistoryRecord } from '../types/models';
import {
  formatCancelledByLabel,
  isTripCancelledStatus,
  tripHistoryEndedAt,
} from '../utils/tripCancellation';
import { colors, typography, spacing, radius } from '../theme';

type Props = {
  trip: TripHistoryRecord;
  showPrice?: boolean;
};

export function TripHistoryCard({ trip, showPrice = true }: Props) {
  const cancelled = isTripCancelledStatus(trip.status);
  const endedAt = tripHistoryEndedAt(trip);

  return (
    <Card style={cancelled ? styles.cardCancelledWrap : styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {trip.originName} → {trip.destinationName}
        </Text>
        <View style={[styles.badge, cancelled ? styles.badgeCancelled : styles.badgeCompleted]}>
          <Text style={[styles.badgeText, cancelled ? styles.badgeTextCancelled : styles.badgeTextCompleted]}>
            {cancelled ? 'Cancelado' : 'Completado'}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {formatDate(endedAt)} · {trip.distanceKm.toFixed(1)} km
        {showPrice && trip.price > 0 ? ` · ${formatPrice(trip.price)}` : ''}
      </Text>
      {cancelled && trip.cancelledBy ? (
        <Text style={styles.cancelMeta}>{formatCancelledByLabel(trip.cancelledBy)}</Text>
      ) : null}
      {!cancelled && trip.driverName ? (
        <Text style={styles.meta}>{trip.driverName}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  cardCancelledWrap: {
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeCompleted: { backgroundColor: colors.borderLight },
  badgeCancelled: { backgroundColor: '#fdecea' },
  badgeText: { ...typography.caption, fontWeight: '600', fontSize: 11 },
  badgeTextCompleted: { color: colors.textSecondary },
  badgeTextCancelled: { color: colors.danger },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  cancelMeta: { ...typography.caption, color: colors.danger, marginTop: 4, fontWeight: '500' },
});
