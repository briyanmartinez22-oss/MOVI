import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader } from '../src/components/FormUI';
import { TripHistoryCard } from '../src/components';
import { useAuth } from '../src/context/AuthContext';
import { useTrip } from '../src/context/TripContext';
import { fetchTripHistoryForRole } from '../src/services/mockApi';
import { getNotifications } from '../src/services/notificationService';
import {
  getDriverByUserId,
  formatTime,
} from '../src/services/profileData';
import type { TripHistoryRecord } from '../src/types/models';
import { getCategoryModeLabel, getServiceCategory } from '../src/data/serviceCategories';
import { colors, typography, spacing } from '../src/theme';

export default function ActivityCenterScreen() {
  const { user, getAllDriverSessions } = useAuth();
  const { activeTrip } = useTrip();
  const [tripHistory, setTripHistory] = useState<TripHistoryRecord[]>([]);

  useEffect(() => {
    void fetchTripHistoryForRole().then(setTripHistory);
  }, [user?.userId]);

  const notifications = getNotifications(user?.userId).slice(0, 10);
  const driver = user ? getDriverByUserId(user.userId) : null;
  const sessions = driver ? getAllDriverSessions(driver.id).slice(0, 5) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Centro de actividad" />
      <ScrollView contentContainerStyle={styles.content}>
        {activeTrip && (
          <Card style={styles.block}>
            <Text style={styles.section}>Viaje activo</Text>
            <Text style={styles.meta}>{activeTrip.origin.name} → {activeTrip.destination.name}</Text>
            <Text style={styles.meta}>
              {getServiceCategory(activeTrip.serviceCategoryId).label} ·{' '}
              {getCategoryModeLabel(activeTrip.serviceCategoryId ?? 'mototaxi', activeTrip.tripType)}
            </Text>
            <Text style={styles.meta}>Estado: {activeTrip.lifecycleStatus}</Text>
          </Card>
        )}

        <Text style={styles.section}>Notificaciones recientes</Text>
        {notifications.length === 0 ? (
          <Text style={styles.meta}>Sin notificaciones</Text>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} style={styles.block}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.meta}>{n.body}</Text>
            </Card>
          ))
        )}

        <Text style={styles.section}>Historial de viajes</Text>
        {tripHistory.length === 0 ? (
          <Text style={styles.meta}>Sin viajes registrados</Text>
        ) : (
          tripHistory.slice(0, 8).map((trip) => <TripHistoryCard key={trip.id} trip={trip} />)
        )}

        {driver && sessions.length > 0 && (
          <>
            <Text style={styles.section}>Conexiones del conductor</Text>
            {sessions.map((s) => (
              <Card key={s.sessionId} style={styles.block}>
                <Text style={styles.meta}>
                  {formatTime(s.connectedAt)} — {s.disconnectedAt ? formatTime(s.disconnectedAt) : 'En curso'}
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  block: { marginBottom: spacing.sm },
  title: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
});
