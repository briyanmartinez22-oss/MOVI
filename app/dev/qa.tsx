import { useCallback, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/FormUI';
import { PrimaryButton } from '../../src/components';
import { DemoManifestPanel } from '../../src/components/DemoManifestPanel';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import {
  getLastQaResult,
  isQaRunning,
  runFullQaSuite,
  type QaStepResult,
} from '../../src/services/qaAutomationService';
import { useAuth } from '../../src/context/AuthContext';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function QaAutomationScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { handleBack, showFallback, goHome } = useSafeBack();
  const [steps, setSteps] = useState<QaStepResult[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<{ passed: number; failed: number } | null>(null);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const handleRun = useCallback(async () => {
    if (isQaRunning()) return;
    setRunning(true);
    setSteps([]);
    setSummary(null);
    try {
      const result = await runFullQaSuite((step) => {
        setSteps((prev) => [...prev, step]);
      });
      setSummary({ passed: result.passed, failed: result.failed });
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al ejecutar QA';
      setSteps((prev) => [
        ...prev,
        {
          id: 'fatal',
          label: 'Error fatal',
          ok: false,
          message,
          durationMs: 0,
        },
      ]);
      setSummary({ passed: 0, failed: 1 });
    } finally {
      setRunning(false);
    }
  }, [refresh]);

  const last = getLastQaResult();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="QA automático"
        onBack={handleBack}
        showFallback={showFallback}
        onGoHome={goHome}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Simula registro, login, viajes, dueño, conductor y administración contra el mock store.
          Reinicia datos demo y valida cada paso automáticamente.
        </Text>

        <DemoManifestPanel />

        <PrimaryButton
          title={running ? 'Ejecutando…' : 'Ejecutar suite completa'}
          onPress={handleRun}
          loading={running}
          disabled={running}
        />

        {running && (
          <View style={styles.runningRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.runningText}>Probando flujos MOVI…</Text>
          </View>
        )}

        {summary && (
          <View style={[styles.summary, summary.failed > 0 && styles.summaryFail]}>
            <Text style={styles.summaryText}>
              {summary.failed === 0
                ? `✓ ${summary.passed} pruebas exitosas`
                : `⚠ ${summary.passed} OK · ${summary.failed} fallidas`}
            </Text>
          </View>
        )}

        {steps.map((step) => (
          <View
            key={`${step.id}-${step.label}`}
            style={[styles.stepCard, step.ok ? styles.stepOk : styles.stepFail]}
          >
            <Ionicons
              name={step.ok ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={step.ok ? colors.online : colors.danger}
            />
            <View style={styles.stepBody}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepMsg}>{step.message}</Text>
              <Text style={styles.stepMeta}>{step.durationMs} ms</Text>
            </View>
          </View>
        ))}

        {last && !running && steps.length === 0 && (
          <Text style={styles.hint}>
            Última ejecución: {last.passed} OK / {last.failed} fallos
          </Text>
        )}

        <TouchableOpacity style={styles.link} onPress={() => router.push('/dev/learning')}>
          <Text style={styles.linkText}>Ir a Conocer MOVI (tour manual)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  runningRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  runningText: { ...typography.caption, color: colors.textSecondary },
  summary: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryFail: { backgroundColor: '#FEE2E2' },
  summaryText: { ...typography.bodyMedium, color: colors.text },
  stepCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepOk: { borderColor: colors.online },
  stepFail: { borderColor: colors.danger },
  stepBody: { flex: 1 },
  stepLabel: { ...typography.bodyMedium, color: colors.text },
  stepMsg: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  stepMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  link: { alignItems: 'center', marginTop: spacing.lg },
  linkText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
