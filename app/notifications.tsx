import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../src/components/FormUI';
import {
  getNotifications,
  markAllRead,
  markNotificationRead,
  AppNotification,
} from '../src/services/notificationService';
import { useAuth } from '../src/context/AuthContext';
import { colors, typography, spacing, radius } from '../src/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>(
    getNotifications(user?.userId)
  );

  const handleRead = (id: string) => {
    markNotificationRead(id);
    setItems([...getNotifications(user?.userId)]);
  };

  const handleReadAll = () => {
    markAllRead(user?.userId);
    setItems([...getNotifications(user?.userId)]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Notificaciones" />
      <TouchableOpacity style={styles.readAll} onPress={handleReadAll}>
        <Text style={styles.readAllText}>Marcar todas como leídas</Text>
      </TouchableOpacity>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay notificaciones aún</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.read && styles.unread]}
            onPress={() => handleRead(item.id)}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleString('es-SV')}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  readAll: { padding: spacing.md, alignItems: 'flex-end' },
  readAllText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  list: { padding: spacing.lg, gap: spacing.sm },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  title: { ...typography.bodyMedium, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  time: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
});
