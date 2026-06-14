import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, LegalConsentCheckbox, DuiConsentCheckbox } from '../../src/components';
import { validateRegistrationConsent } from '../../src/utils/registrationConsent';
import { FormInput, ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { useAuth } from '../../src/context/AuthContext';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { showSuccess } from '../../src/utils/feedback';
import * as mockApi from '../../src/services/mockApi';
import type { BusinessType } from '../../src/types/models';
import { salvadorPlaces } from '../../src/data/mock';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { colors, typography, spacing } from '../../src/theme';

const BUSINESS_TYPES: { id: BusinessType; label: string }[] = [
  { id: 'restaurant', label: 'Restaurante' },
  { id: 'store', label: 'Tienda' },
  { id: 'pharmacy', label: 'Farmacia' },
  { id: 'commerce', label: 'Comercio' },
  { id: 'startup', label: 'Emprendimiento' },
  { id: 'other', label: 'Otro' },
];

export default function RegisterBusinessScreen() {
  const router = useRouter();
  const {
    phone,
    dui,
    verified,
    action,
    consented,
    responsibleName: nameParam,
    businessName: bizParam,
    businessPhone: bizPhoneParam,
    nit: nitParam,
    businessType: typeParam,
  } = useLocalSearchParams<{
    phone: string;
    dui: string;
    verified?: string;
    action?: string;
    consented?: string;
    responsibleName?: string;
    businessName?: string;
    businessPhone?: string;
    nit?: string;
    businessType?: string;
  }>();
  const { refresh } = useAuth();
  const [responsibleName, setResponsibleName] = useState(nameParam ?? '');
  const [businessName, setBusinessName] = useState(bizParam ?? '');
  const [businessPhone, setBusinessPhone] = useState(bizPhoneParam ?? phone ?? '');
  const [nit, setNit] = useState(nitParam ?? '');
  const [businessType, setBusinessType] = useState<BusinessType>(
    (typeParam as BusinessType) || 'restaurant'
  );
  const [termsAccepted, setTermsAccepted] = useState(consented === '1');
  const [privacyAccepted, setPrivacyAccepted] = useState(consented === '1');
  const [duiAccepted, setDuiAccepted] = useState(consented === '1');
  const [error, setError] = useState('');
  const registerStarted = useRef(false);
  const { loading, timedOut, run, retry } = useAsyncAction();

  const submitRegister = async () => {
    setError('');
    const place = salvadorPlaces[1];
    await run(async () => {
      const res = await mockApi.registerBusiness(
        phone ?? '',
        responsibleName.trim(),
        dui ?? '',
        {
          businessName: businessName.trim(),
          businessType,
          businessPhone: businessPhone.trim(),
          nit: nit.trim() || undefined,
          latitude: place.coordinates.latitude,
          longitude: place.coordinates.longitude,
          addressLabel: place.name,
        }
      );
      if (res.ok) {
        refresh();
        showSuccess('Negocio registrado', 'Ya puedes solicitar entregas desde tu dashboard.');
        router.replace('/business/dashboard');
      } else setError(res.error ?? 'Error al registrar');
    });
  };

  useEffect(() => {
    if (action === 'register' && !registerStarted.current) {
      registerStarted.current = true;
      void submitRegister();
    }
  }, [action]);

  const handleRegister = async () => {
    if (!responsibleName.trim() || !businessName.trim()) {
      setError('Completa nombre del responsable y del negocio');
      return;
    }
    if (verified !== '1') {
      setError('Verifica tu teléfono antes de continuar');
      return;
    }
    const consentError = validateRegistrationConsent(
      { termsAccepted, privacyAccepted },
      duiAccepted
    );
    if (consentError) {
      setError(consentError);
      return;
    }
    void submitRegister();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Registrar negocio" />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        <Text style={styles.duiLabel}>Teléfono</Text>
        <Text style={styles.duiValue}>{phone ?? ''}</Text>
        <Text style={styles.duiHint}>{FIELD_HINTS.phone}</Text>
        <Text style={styles.duiLabel}>DUI del responsable</Text>
        <Text style={styles.duiValue}>{dui ?? ''}</Text>
        <Text style={styles.duiHint}>{FIELD_HINTS.dui}</Text>
        <FormInput label="Nombre del responsable" value={responsibleName} onChangeText={setResponsibleName} placeholder="Ana López" />
        <FormInput label="Nombre del negocio" value={businessName} onChangeText={setBusinessName} placeholder="Café Centro" />
        <FormInput label="Teléfono del negocio" value={businessPhone} onChangeText={setBusinessPhone} keyboardType="phone-pad" />
        <FormInput label="NIT (opcional)" value={nit} onChangeText={setNit} placeholder="0614-000000-000-0" />
        <Text style={styles.label}>Tipo de negocio</Text>
        <View style={styles.chips}>
          {BUSINESS_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.chip, businessType === t.id && styles.chipActive]}
              onPress={() => setBusinessType(t.id)}
            >
              <Text style={styles.chipText}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <LegalConsentCheckbox
          termsAccepted={termsAccepted}
          privacyAccepted={privacyAccepted}
          onTermsChange={setTermsAccepted}
          onPrivacyChange={setPrivacyAccepted}
        />
        <DuiConsentCheckbox accepted={duiAccepted} onChange={setDuiAccepted} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Registrar negocio" onPress={handleRegister} loading={loading} />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  duiLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  duiValue: { ...typography.body, color: colors.text },
  duiHint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { backgroundColor: colors.borderLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  error: { color: colors.danger, marginBottom: spacing.md },
});
