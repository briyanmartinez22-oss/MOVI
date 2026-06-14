/** Canonical MOVI format for El Salvador: +503XXXXXXXX */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 8) {
    return `+503${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('503')) {
    return `+${digits}`;
  }

  return '';
}

export function isValidSalvadorPhone(phone: string): boolean {
  return /^\+503\d{8}$/.test(normalizePhone(phone));
}
