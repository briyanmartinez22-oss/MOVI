/** Canonical MOVI phone format: +503XXXXXXXX (El Salvador) or +1XXXXXXXXXX (US) */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  const compact = trimmed.replace(/\s/g, '');
  if (/^\+503\d{8}$/.test(compact)) return compact;
  if (/^\+1\d{10}$/.test(compact)) return compact;

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // SV local with trunk prefix 0: 077777777 → 77777777
  if (digits.length === 9 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

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

/** Alternate keys used by legacy rows before canonical migration. */
export function phoneLookupVariants(phone: string): string[] {
  const canonical = normalizePhone(phone);
  if (!canonical) return [];

  const variants = new Set<string>([canonical]);
  const digits = canonical.replace(/\D/g, '');

  if (canonical.startsWith('+503')) {
    const local = digits.slice(3);
    variants.add(local);
    variants.add(`503${local}`);
    variants.add(`0${local}`);
  }

  if (canonical.startsWith('+1')) {
    const local = digits.slice(1);
    variants.add(local);
  }

  return [...variants];
}
