import type { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';

type CheckboxRowProps = {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function CheckboxRow({ checked, onToggle, children }: CheckboxRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Ionicons name="checkmark" size={16} color={colors.primaryText} /> : null}
      </View>
      <Text style={styles.label}>{children}</Text>
    </TouchableOpacity>
  );
}

export type LegalConsentValue = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

export function isLegalConsentComplete(value: LegalConsentValue): boolean {
  return value.termsAccepted && value.privacyAccepted;
}

type Props = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  onPrivacyChange: (accepted: boolean) => void;
};

export function LegalConsentCheckbox({
  termsAccepted,
  privacyAccepted,
  onTermsChange,
  onPrivacyChange,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <CheckboxRow checked={termsAccepted} onToggle={() => onTermsChange(!termsAccepted)}>
        Acepto los{' '}
        <Text style={styles.link} onPress={() => router.push('/legal/terms')}>
          Términos y Condiciones
        </Text>{' '}
        de MOVI (obligatorio)
      </CheckboxRow>
      <CheckboxRow checked={privacyAccepted} onToggle={() => onPrivacyChange(!privacyAccepted)}>
        Acepto la{' '}
        <Text style={styles.link} onPress={() => router.push('/legal/privacy')}>
          Política de Privacidad
        </Text>{' '}
        de MOVI (obligatorio)
      </CheckboxRow>
    </View>
  );
}

type DuiConsentProps = {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
};

export function DuiConsentCheckbox({ accepted, onChange }: DuiConsentProps) {
  return (
    <Pressable style={styles.duiRow} onPress={() => onChange(!accepted)}>
      <View style={[styles.box, accepted && styles.boxChecked]}>
        {accepted ? <Ionicons name="checkmark" size={16} color={colors.primaryText} /> : null}
      </View>
      <Text style={styles.duiText}>
        Declaro que el DUI ingresado es mío, es veraz y coincide con mi documento de identidad.
        Autorizo su uso para verificación y prevención de fraude conforme a la política de MOVI
        (obligatorio).
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.surface,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: { ...typography.caption, color: colors.text, flex: 1, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  duiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  duiText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 20 },
});
