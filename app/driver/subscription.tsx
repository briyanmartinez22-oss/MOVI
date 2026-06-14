import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Card } from '../../src/components/FormUI';
import { PrimaryButton } from '../../src/components';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import { useMockApi } from '../../src/services/api/config';
import * as mockApi from '../../src/services/mockApi';
import {
  getDriverByUserId,
  getDriverSubscription,
  upsertDriverSubscription,
  refreshSubscription,
} from '../../src/services/profileData';
import {
  SUBSCRIPTION_MONTHLY_USD,
  formatPaymentMethod,
  formatSubscriptionStatus,
  mockProcessPayment,
  resolveSubscriptionStatus,
} from '../../src/services/subscriptionService';
import type { PaymentMethodBrand } from '../../src/types/models';
import { showSuccess } from '../../src/utils/feedback';
import { colors, typography, spacing } from '../../src/theme';

const METHODS: PaymentMethodBrand[] = [
  'visa_credit',
  'visa_debit',
  'mastercard_credit',
  'mastercard_debit',
];

const PROVIDERS = ['Wompi', 'BAC', 'Banco Agrícola', 'Stripe'] as const;

export default function DriverSubscriptionScreen() {
  const { user } = useAuth();
  const { loading, error } = useProfileBootstrap();
  const driver = user ? getDriverByUserId(user.userId) : undefined;
  const sub = driver ? getDriverSubscription(driver.id) : undefined;
  const [method, setMethod] = useState<PaymentMethodBrand>('visa_debit');
  const [paying, setPaying] = useState(false);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Suscripción" />
        <BrandedLoadingView message="Cargando suscripción…" />
      </SafeAreaView>
    );
  }

  if (!driver || !sub) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Suscripción" />
        <Text style={styles.meta}>Perfil de conductor no encontrado</Text>
      </SafeAreaView>
    );
  }

  const status = resolveSubscriptionStatus(sub);
  const nextBill = new Date(sub.nextBillingAt).toLocaleDateString('es-SV', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePay = async () => {
    if (useMockApi()) {
      const updated = mockProcessPayment(sub, method);
      upsertDriverSubscription(updated);
      showSuccess('Pago registrado', 'Plan activo hasta el próximo cobro el día 1.');
      return;
    }

    setPaying(true);
    const res = await mockApi.payDriverSubscription();
    setPaying(false);
    if (!res.ok) {
      Alert.alert('Error', res.error ?? 'No se pudo procesar el pago');
      return;
    }
    await refreshSubscription(driver.id);
    showSuccess('Pago registrado', 'Plan activo hasta el próximo cobro el día 1.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Suscripción conductor" />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Card>
          <Text style={styles.label}>Estado</Text>
          <Text style={styles.value}>{formatSubscriptionStatus(status)}</Text>
          <Text style={styles.label}>Monto mensual</Text>
          <Text style={styles.value}>${SUBSCRIPTION_MONTHLY_USD} USD</Text>
          <Text style={styles.label}>Próximo cobro</Text>
          <Text style={styles.value}>{nextBill} (día 1 de cada mes)</Text>
          <Text style={styles.label}>Método de pago</Text>
          <Text style={styles.value}>{formatPaymentMethod(sub.paymentMethod)}</Text>
        </Card>

        <Text style={styles.section}>Primer mes gratis</Text>
        <Text style={styles.meta}>
          Desde tu registro hasta el día 1 del mes siguiente no se cobra. MOVI no cobra comisión por viaje.
        </Text>

        <Text style={styles.section}>Selecciona método</Text>
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, method === m && styles.chipActive]}
            onPress={() => setMethod(m)}
          >
            <Text style={styles.chipText}>{formatPaymentMethod(m)}</Text>
          </TouchableOpacity>
        ))}

        <PrimaryButton
          title={status === 'past_due' ? 'Pagar y reactivar' : 'Actualizar método de pago'}
          onPress={handlePay}
          loading={paying}
          style={{ marginTop: spacing.lg }}
        />

        <Text style={styles.section}>Pasarelas preparadas</Text>
        <Text style={styles.meta}>{PROVIDERS.join(' · ')} (integración mock)</Text>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  value: { ...typography.bodyMedium, color: colors.text },
  section: { ...typography.subtitle, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  meta: { ...typography.caption, color: colors.textSecondary },
  chip: {
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  chipActive: { borderWidth: 1.5, borderColor: colors.primary },
  chipText: { ...typography.body, color: colors.text },
});
