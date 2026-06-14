import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {
  clearDiagnostics,
  getDiagnostics,
  loadDiagnostics,
  subscribeDiagnostics,
  type DiagnosticEntry,
} from '../services/diagnosticsService';
import { colors, typography, spacing, radius } from '../theme';

export function DiagnosticsPanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);

  useEffect(() => {
    if (!__DEV__) return;
    void loadDiagnostics();
    return subscribeDiagnostics(() => setEntries(getDiagnostics()));
  }, []);

  if (!__DEV__) return null;

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)}>
        <Text style={styles.fabText}>DX</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>MOVI Diagnostics</Text>
            <Text style={styles.subtitle}>{entries.length} registro(s)</Text>
            <ScrollView style={styles.list}>
              {entries.length === 0 ? (
                <Text style={styles.empty}>Sin errores registrados</Text>
              ) : (
                entries.map((e) => (
                  <View key={e.id} style={styles.item}>
                    <Text style={styles.error}>{e.error}</Text>
                    <Text style={styles.meta}>Ruta: {e.route}</Text>
                    <Text style={styles.meta}>
                      Usuario: {e.userId ?? '—'} · Rol: {e.role ?? '—'}
                    </Text>
                    <Text style={styles.meta}>{new Date(e.date).toLocaleString()}</Text>
                    {e.stack ? <Text style={styles.stack} numberOfLines={4}>{e.stack}</Text> : null}
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={async () => {
                await clearDiagnostics();
                setEntries([]);
              }}
            >
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    opacity: 0.85,
  },
  fabText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '75%',
    padding: spacing.lg,
  },
  title: { ...typography.subtitle, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  list: { maxHeight: 400 },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  item: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  error: { ...typography.bodyMedium, color: colors.danger },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  stack: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  clearBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
  },
  clearText: { ...typography.button, color: colors.primary },
});
