const REGISTRATION_DOC_KEYS = [
  'registrationCardImage',
  'registrationCard',
  'registration_card',
  'circulationCard',
  'circulationCardImage',
] as const;

function isPresentDocumentValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  return false;
}

/** Beta-lenient: any non-empty URL/string in a registration doc field counts as present. */
export function hasRegistrationCardDocument(
  docs: Record<string, unknown>,
  registrationCardColumn?: string | null
): boolean {
  if (isPresentDocumentValue(registrationCardColumn)) return true;

  for (const key of REGISTRATION_DOC_KEYS) {
    if (isPresentDocumentValue(docs[key])) return true;
  }

  for (const [key, value] of Object.entries(docs)) {
    if (/registration|circulaci[oó]n/i.test(key) && isPresentDocumentValue(value)) {
      return true;
    }
  }

  return false;
}

export function pickRegistrationCardUrl(
  docs: Record<string, unknown>,
  registrationCardColumn?: string | null
): string | null {
  if (isPresentDocumentValue(registrationCardColumn)) {
    return String(registrationCardColumn).trim();
  }

  for (const key of REGISTRATION_DOC_KEYS) {
    const value = docs[key];
    if (isPresentDocumentValue(value)) return String(value).trim();
  }

  for (const [key, value] of Object.entries(docs)) {
    if (/registration|circulaci[oó]n/i.test(key) && isPresentDocumentValue(value)) {
      return String(value).trim();
    }
  }

  return null;
}
