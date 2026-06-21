import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { DispatchCandidate } from '../../../types/adminCenter';
import { fetchDispatchCandidates } from '../../../services/api';
import { colors, typography, spacing, radius } from '../../../theme';

type Props = {
  visible: boolean;
  tripId: string | null;
  onClose: () => void;
  onConfirm: (driverId: string) => Promise<void>;
};

export function DispatchDriverModal({ visible, tripId, onClose, onConfirm }: Props) {
  const [candidates, setCandidates] = useState<DispatchCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !tripId) {
      setCandidates([]);
      setSelectedId(null);
      return;
    }
    setLoading(true);
    void fetchDispatchCandidates(tripId)
      .then(setCandidates)
      .finally(() => setLoading(false));
  }, [visible, tripId]);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Asignar conductor (dispatch)</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : candidates.length === 0 ? (
            <Text style={styles.muted}>Sin conductores online</Text>
          ) : (
            <ScrollView style={styles.list}>
              {candidates.map((c) => {
                const selected = selectedId === c.driverId;
                return (
                  <TouchableOpacity
                    key={c.driverId}
                    style={[styles.option, selected && styles.optionSelected, c.busy && styles.busy]}
                    onPress={() => !c.busy && setSelectedId(c.driverId)}
                    disabled={c.busy}
                  >
                    <Text style={styles.optionName}>
                      {c.name} · ⭐ {c.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.optionMeta}>
                      {c.unitNumber ?? '—'} · {c.plateNumber ?? '—'}
                    </Text>
                    <Text style={styles.optionMeta}>
                      {c.busy ? 'Ocupado' : `${c.distanceKm ?? '—'} km · ETA ${c.etaMinutes ?? '—'} min`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedId && styles.confirmDisabled]}
              onPress={() => void handleConfirm()}
              disabled={!selectedId || submitting}
            >
              <Text style={styles.confirmText}>
                {submitting ? 'Asignando…' : 'Asignar'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '75%',
  },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  muted: { ...typography.caption, color: colors.textSecondary },
  list: { maxHeight: 320, marginBottom: spacing.md },
  option: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}12` },
  busy: { opacity: 0.5 },
  optionName: { ...typography.bodyMedium, color: colors.text },
  optionMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cancelText: { ...typography.bodyMedium, color: colors.text },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { ...typography.bodyMedium, color: colors.primaryText },
});
