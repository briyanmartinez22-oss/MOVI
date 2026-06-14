import { UserRole } from '../types/models';

/** Formato oficial: MOVI-UNIT-000001 */
export function generateUnitId(existingCount: number): string {
  const seq = String(existingCount + 1).padStart(6, '0');
  return `MOVI-UNIT-${seq}`;
}

/** Formato oficial: MOVI-DRV-000001 */
export function generateDriverPublicId(existingCount: number): string {
  const seq = String(existingCount + 1).padStart(6, '0');
  return `MOVI-DRV-${seq}`;
}

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

/** Solo dígitos del DUI (sin guiones, espacios ni otros caracteres). */
export function normalizeDuiDigits(dui: string): string {
  return dui.replace(/\D/g, '');
}

/** Formato canónico para almacenamiento: XXXXXXXX-X cuando hay 9+ dígitos. */
export function normalizeDui(dui: string): string {
  const digits = normalizeDuiDigits(dui);
  if (digits.length >= 9) {
    return `${digits.slice(0, 8)}-${digits.slice(8, 9)}`;
  }
  return digits;
}

/** Compara DUIs ignorando guiones, espacios y demás caracteres no numéricos. */
export function duiMatches(a: string, b: string): boolean {
  const left = normalizeDuiDigits(a);
  const right = normalizeDuiDigits(b);
  if (!left || !right) return false;
  return left === right;
}

/** Variantes de formato usadas en QA (teclado numérico iOS, espacios, guiones). */
export function duiFormatVariants(dui: string): string[] {
  const digits = normalizeDuiDigits(dui);
  const canonical = normalizeDui(dui);
  const unique = new Set<string>([
    canonical,
    digits,
    `${digits.slice(0, 8)} ${digits.slice(8)}`,
    `  ${canonical}  `,
    `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`,
  ]);
  return [...unique];
}

export function namesMatch(a: string, b: string): boolean {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  return clean(a) === clean(b);
}

export function sortOffers<T extends { etaMinutes: number; price: number }>(offers: T[]): T[] {
  return [...offers].sort((a, b) => {
    if (a.etaMinutes !== b.etaMinutes) return a.etaMinutes - b.etaMinutes;
    return a.price - b.price;
  });
}

export function getRoleHomeRoute(role: UserRole): string {
  switch (role) {
    case 'passenger':
      return '/passenger';
    case 'driver':
      return '/driver';
    case 'owner':
      return '/owner/dashboard';
    case 'business':
      return '/business/dashboard';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}
