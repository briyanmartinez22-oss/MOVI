import type { LegalConsentValue } from '../components/LegalConsentCheckbox';
import { isLegalConsentComplete } from '../components/LegalConsentCheckbox';

export function validateRegistrationConsent(
  legal: LegalConsentValue,
  duiAccepted = true
): string | null {
  if (!isLegalConsentComplete(legal)) {
    return 'Debes aceptar los Términos y Condiciones y la Política de Privacidad';
  }
  if (!duiAccepted) {
    return 'Debes confirmar la veracidad de tu DUI';
  }
  return null;
}
