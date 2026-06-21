import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Card } from '../../src/components/FormUI';
import {
  createSupportTicketApi,
  fetchSupportTickets,
  postSupportTicketMessageApi,
  updateSupportTicketApi,
} from '../../src/services/api';
import { useMockApi } from '../../src/services/api/config';
import type { SupportTicketRecord } from '../../src/types/adminCenter';
import { colors, typography, spacing, radius } from '../../src/theme';

const STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'] as const;

export default function AdminSupportScreen() {
  const router = useRouter();
  const mockMode = useMockApi();
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [filter, setFilter] = useState<string>('open');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicketRecord | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchSupportTickets(filter);
    setTickets(list);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = (ticket: SupportTicketRecord, status: string) => {
    void updateSupportTicketApi(ticket.id, { status }).then((res) => {
      if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo actualizar');
      else void load();
    });
  };

  const handleAssign = (ticket: SupportTicketRecord) => {
    void updateSupportTicketApi(ticket.id, { status: 'assigned', assignedTo: 'admin' }).then(
      (res) => {
        if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo asignar');
        else void load();
      }
    );
  };

  const handleSendMessage = () => {
    if (!selected || !message.trim()) return;
    void postSupportTicketMessageApi(selected.id, message.trim()).then((res) => {
      if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo enviar');
      else {
        setMessage('');
        Alert.alert('Mensaje enviado');
      }
    });
  };

  const handleCreateDemo = () => {
    void createSupportTicketApi({
      userId: selected?.user.id ?? 'demo-user',
      subject: 'Nuevo ticket operativo',
      description: 'Creado desde bandeja admin',
      priority: 'medium',
      category: 'general',
    }).then((res) => {
      if (!res.ok) Alert.alert('Error', res.error ?? 'No se pudo crear');
      else void load();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Soporte operativo" onBack={() => router.replace('/admin')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          {mockMode ? 'Modo simulación' : 'PostgreSQL · tickets reales'}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, filter === s && styles.chipActive]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.createBtn} onPress={handleCreateDemo}>
          <Text style={styles.createText}>+ Crear ticket</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : tickets.length === 0 ? (
          <Text style={styles.muted}>Sin tickets en este estado</Text>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} style={styles.ticketCard}>
              <TouchableOpacity onPress={() => setSelected(ticket)}>
                <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                <Text style={styles.ticketMeta}>
                  {ticket.status} · {ticket.priority} · {ticket.user.fullName}
                </Text>
                {ticket.tripId ? (
                  <Text style={styles.ticketLink}>Viaje: {ticket.tripId}</Text>
                ) : null}
              </TouchableOpacity>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => handleAssign(ticket)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Asignar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleStatus(ticket, 'in_progress')}
                  style={styles.smallBtn}
                >
                  <Text style={styles.smallBtnText}>En progreso</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleStatus(ticket, 'resolved')}
                  style={styles.smallBtn}
                >
                  <Text style={styles.smallBtnText}>Resolver</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {selected ? (
          <Card style={styles.detail}>
            <Text style={styles.section}>Ticket seleccionado</Text>
            <Text style={styles.line}>{selected.subject}</Text>
            <Text style={styles.line}>{selected.description}</Text>
            <TextInput
              style={styles.input}
              placeholder="Mensaje al usuario..."
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity style={styles.createBtn} onPress={handleSendMessage}>
              <Text style={styles.createText}>Enviar mensaje</Text>
            </TouchableOpacity>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  filters: { marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  chipTextActive: { color: '#fff' },
  createBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createText: { ...typography.body, color: '#fff', fontWeight: '600' },
  ticketCard: { marginBottom: spacing.sm, padding: spacing.md },
  ticketSubject: { ...typography.subtitle, color: colors.text },
  ticketMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  ticketLink: { ...typography.caption, color: colors.primary, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  smallBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  smallBtnText: { ...typography.caption, color: colors.text },
  detail: { marginTop: spacing.lg, padding: spacing.md },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  line: { ...typography.body, color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    marginBottom: spacing.md,
    color: colors.text,
  },
  muted: { ...typography.body, color: colors.textMuted },
});
