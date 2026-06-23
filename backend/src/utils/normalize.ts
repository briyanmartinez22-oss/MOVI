export { normalizePhone, isValidSalvadorPhone } from './phone';

export function normalizeDuiDigits(dui: string): string {
  return dui.replace(/\D/g, '');
}

export function normalizeDui(dui: string): string {
  const digits = normalizeDuiDigits(dui);
  if (digits.length >= 9) {
    return `${digits.slice(0, 8)}-${digits.slice(8, 9)}`;
  }
  return digits;
}

export function duiMatches(a: string, b: string): boolean {
  const left = normalizeDuiDigits(a);
  const right = normalizeDuiDigits(b);
  if (!left || !right) return false;
  return left === right;
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

export function generateUnitId(existingCount: number): string {
  const seq = String(existingCount + 1).padStart(6, '0');
  return `MOVI-UNIT-${seq}`;
}

export function generateDriverPublicId(existingCount: number): string {
  const seq = String(existingCount + 1).padStart(6, '0');
  return `MOVI-DRV-${seq}`;
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function toAuthUser(user: {
  id: string;
  fullName: string;
  phoneNumber: string;
  duiNumber: string | null;
  role: string;
  phoneVerified: boolean;
  passwordHash?: string | null;
  profilePhoto: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const passwordSet = Boolean(user.passwordHash);
  return {
    userId: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    duiNumber: user.duiNumber ?? '',
    role: user.role,
    phoneVerified: user.phoneVerified,
    passwordSet,
    needsPasswordSet: !passwordSet && user.role !== 'admin',
    profilePhoto: user.profilePhoto ?? undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function parseJsonField<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJsonField(value: unknown): string {
  return JSON.stringify(value ?? {});
}
