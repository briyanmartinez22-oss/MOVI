import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { useAuth } from '../../src/context/AuthContext';
import { useTrip } from '../../src/context/TripContext';
import {
  getChatMessages,
  loadChatHistory,
  sendChatMessage,
  seedChatIfEmpty,
  resolveChatSenderRole,
  subscribeChatMessages,
  ChatMessage,
  ChatSenderRole,
} from '../../src/services/chatService';
import { useMockApi } from '../../src/services/api/config';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { colors, typography, spacing, radius } from '../../src/theme';

const ROLE_LABELS: Record<ChatSenderRole, string> = {
  passenger: 'Pasajero',
  driver: 'Conductor',
  business: 'Negocio',
};

export default function TripChatScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const { activeTrip } = useTrip();
  const resolvedTripId = tripId ?? activeTrip?.id ?? 'trip-active';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  const refreshMessages = useCallback(() => {
    setMessages(getChatMessages(resolvedTripId));
  }, [resolvedTripId]);

  useEffect(() => {
    if (useMockApi()) {
      seedChatIfEmpty(resolvedTripId, {
        tripKind: activeTrip?.kind,
      });
      refreshMessages();
      return;
    }
    void loadChatHistory(resolvedTripId).then(refreshMessages);
  }, [resolvedTripId, activeTrip?.kind, refreshMessages]);

  useEffect(() => {
    const unsubscribe = subscribeChatMessages((tripId) => {
      if (tripId === resolvedTripId) refreshMessages();
    });
    return unsubscribe;
  }, [resolvedTripId, refreshMessages]);

  useEffect(() => {
    if (useMockApi()) {
      const interval = setInterval(refreshMessages, 3000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [refreshMessages]);

  const senderRole = resolveChatSenderRole(user?.role, activeTrip?.kind);
  const chatTitle =
    activeTrip?.kind === 'delivery' || activeTrip?.kind === 'personal_delivery'
      ? 'Chat negocio–conductor'
      : 'Chat pasajero–conductor';

  const handleSend = () => {
    if (!text.trim() || !user) return;
    Keyboard.dismiss();
    sendChatMessage(resolvedTripId, user.userId, senderRole, text.trim());
    setText('');
    refreshMessages();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={chatTitle} />
      <KeyboardAwareScreen style={styles.flex}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.userId;
            const isSystemSeed = item.senderId.startsWith('seed-');
            return (
              <View style={[styles.bubbleWrap, isMine ? styles.mineWrap : styles.theirsWrap]}>
                {!isMine && !isSystemSeed ? (
                  <Text style={styles.roleLabel}>{ROLE_LABELS[item.senderRole]}</Text>
                ) : null}
                <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, isMine && styles.mineText]}>{item.text}</Text>
                </View>
              </View>
            );
          }}
        />
        <Text style={styles.hint}>{FIELD_HINTS.chatMessage}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubbleWrap: { marginBottom: spacing.sm, maxWidth: '85%' },
  mineWrap: { alignSelf: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start' },
  roleLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
    marginLeft: spacing.xs,
  },
  bubble: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  mine: { backgroundColor: colors.primary },
  theirs: { backgroundColor: colors.borderLight },
  bubbleText: { ...typography.body, color: colors.text },
  mineText: { color: colors.primaryText },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  sendText: { ...typography.button, color: colors.primaryText },
});
