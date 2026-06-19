/** Canonical MOVI phone format: +503XXXXXXXX (El Salvador) or +1XXXXXXXXXX (US) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 8) {
    return `+503${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('503')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return '';
}

export function isValidSalvadorPhone(phone: string): boolean {
  return /^\+503\d{8}$/.test(normalizePhone(phone));
}

export function isValidUsPhone(phone: string): boolean {
  return /^\+1\d{10}$/.test(normalizePhone(phone));
}

export function isValidMoviPhone(phone: string): boolean {
  return isValidSalvadorPhone(phone) || isValidUsPhone(phone);
}

export function phoneRegion(phone: string): 'SV' | 'US' | null {
  const normalized = normalizePhone(phone);
  if (/^\+503\d{8}$/.test(normalized)) return 'SV';
  if (/^\+1\d{10}$/.test(normalized)) return 'US';
  return null;
}
