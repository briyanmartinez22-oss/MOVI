import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Card } from '../../src/components/FormUI';
import { fetchAuditLogs } from '../../src/services/api';
import { useMockApi } from '../../src/services/api/config';
import type { AuditLogRecord } from '../../src/types/adminCenter';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function AdminAuditScreen() {
  const router = useRouter();
  const mockMode = useMockApi();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');
  const [userId, setUserId] = useState('');

  const search = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (action.trim()) params.action = action.trim();
    if (entityId.trim()) params.entityId = entityId.trim();
    if (userId.trim()) params.userId = userId.trim();
    const result = await fetchAuditLogs(params);
    setLogs(result);
    setLoading(false);
  }, [action, entityId, userId]);

  useEffect(() => {
    void search();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Auditoría admin" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          {mockMode ? 'Modo simulación' : 'PostgreSQL · AuditLog'}
        </Text>

        <Card style={styles.filters}>
          <TextInput
            style={styles.input}
            placeholder="Acción (dispatch, cancel_trip...)"
            value={action}
            onChangeText={setAction}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="entityId (trip, user...)"
            value={entityId}
            onChangeText={setEntityId}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="userId / admin"
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => void search()}>
            <Text style={styles.searchText}>Buscar</Text>
          </TouchableOpacity>
        </Card>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : logs.length === 0 ? (
          <Text style={styles.muted}>Sin registros</Text>
        ) : (
          logs.map((log) => (
            <Card key={log.id} style={styles.logCard}>
              <Text style={styles.action}>{log.action}</Text>
              <Text style={styles.meta}>
                {log.actorRole ?? log.actor?.role ?? '—'} · {log.entityType}{' '}
                {log.entityId ?? ''}
              </Text>
              <Text style={styles.meta}>
                {log.actor?.fullName ?? log.userId ?? '—'} ·{' '}
                {new Date(log.createdAt).toLocaleString()}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  filters: { padding: spacing.md, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  searchText: { ...typography.body, color: '#fff', fontWeight: '600' },
  logCard: { padding: spacing.md, marginBottom: spacing.sm },
  action: { ...typography.subtitle, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  muted: { ...typography.caption, color: colors.textMuted },
});
