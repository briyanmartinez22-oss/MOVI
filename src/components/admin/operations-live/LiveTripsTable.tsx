import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge } from '../../FormUI';
import type { TripRequest } from '../../../types';
import { colors, typography, spacing, radius } from '../../../theme';

type Props = {
  trips: TripRequest[];
  onViewTrip: (trip: TripRequest) => void;
  onReassignTrip: (trip: TripRequest) => void;
  onCancelTrip: (trip: TripRequest) => void;
  onDispatchTrip?: (trip: TripRequest) => void;
};

function formatWait(createdAt: number): string {
  const mins = Math.round((Date.now() - createdAt) / 60000);
  if (mins < 1) return '<1 min';
  return `${mins} min`;
}

export function LiveTripsTable({ trips, onViewTrip, onReassignTrip, onCancelTrip, onDispatchTrip }: Props) {
  if (trips.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyText}>Sin viajes activos o pendientes</Text>
      </Card>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Viajes en vivo ({trips.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.headerScroll}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.cellPassenger]}>Pasajero</Text>
          <Text style={[styles.headerCell, styles.cellRoute]}>Ruta</Text>
          <Text style={[styles.headerCell, styles.cellStatus]}>Estado</Text>
          <Text style={[styles.headerCell, styles.cellWait]}>Espera</Text>
          <Text style={[styles.headerCell, styles.cellOffers]}>Ofertas</Text>
          <Text style={[styles.headerCell, styles.cellActions]}>Acciones</Text>
        </View>
      </ScrollView>
      {trips.map((trip) => (
        <Card key={trip.id} style={styles.rowCard}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.cellPassenger]} numberOfLines={1}>
              {trip.passengerName}
            </Text>
            <Text style={[styles.cell, styles.cellRoute]} numberOfLines={2}>
              {trip.origin.name} → {trip.destination.name}
            </Text>
            <View style={styles.cellStatus}>
              <StatusBadge status={trip.lifecycleStatus} />
            </View>
            <Text style={[styles.cell, styles.cellWait]}>{formatWait(trip.createdAt)}</Text>
            <Text style={[styles.cell, styles.cellOffers]}>{trip.offers.length}</Text>
            <View style={[styles.cellActions, styles.actions]}>
              {(trip.lifecycleStatus === 'requested' || trip.lifecycleStatus === 'offered') &&
              !trip.acceptedOffer &&
              onDispatchTrip ? (
                <TouchableOpacity onPress={() => onDispatchTrip(trip)} style={styles.actionBtn}>
                  <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => onViewTrip(trip)} style={styles.actionBtn}>
                <Ionicons name="eye-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onReassignTrip(trip)} style={styles.actionBtn}>
                <Ionicons name="swap-horizontal" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onCancelTrip(trip)} style={styles.actionBtn}>
                <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  title: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  headerScroll: { marginBottom: spacing.xs },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    minWidth: 640,
  },
  headerCell: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  rowCard: { marginBottom: spacing.xs, paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 640,
  },
  cell: { ...typography.caption, color: colors.text },
  cellPassenger: { width: 100 },
  cellRoute: { width: 160 },
  cellStatus: { width: 110 },
  cellWait: { width: 56, textAlign: 'center' },
  cellOffers: { width: 48, textAlign: 'center' },
  cellActions: { width: 96 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  actionBtn: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  emptyCard: { marginBottom: spacing.md },
  emptyText: { ...typography.caption, color: colors.textSecondary },
});
