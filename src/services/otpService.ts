import { UserRole } from '../types/models';

export const DEMO_OTP_CODE = '123456';

export interface OtpRequestResult {
  ok: boolean;
  sent?: boolean;
  error?: string;
}

export interface OtpVerifyResult {
  ok: boolean;
  verified?: boolean;
  isNewUser?: boolean;
  error?: string;
}

let pendingPhone: string | null = null;

export async function requestOtp(phoneNumber: string): Promise<OtpRequestResult> {
  const normalized = phoneNumber.replace(/\D/g, '');
  if (normalized.length < 8) {
    return { ok: false, error: 'Número de teléfono inválido' };
  }
  pendingPhone = normalized;
  // Future: integrate SMS provider (Twilio, etc.)
  return { ok: true, sent: true };
}

export async function verifyOtp(
  phoneNumber: string,
  code: string,
  findUser: (phone: string) => unknown | undefined
): Promise<OtpVerifyResult> {
  const normalized = phoneNumber.replace(/\D/g, '');
  if (code !== DEMO_OTP_CODE) {
    return { ok: false, error: 'Código OTP inválido. Usa 123456 en demo.' };
  }
  if (pendingPhone && pendingPhone !== normalized) {
    return { ok: false, error: 'El teléfono no coincide con la solicitud OTP.' };
  }
  const existing = findUser(normalized);
  return {
    ok: true,
    verified: true,
    isNewUser: !existing,
  };
}

export function getRoleHomeRoute(role: UserRole): string {
  switch (role) {
    case 'passenger':
      return '/passenger';
    case 'driver':
      return '/driver';
    case 'owner':
      return '/owner/dashboard';
    case 'admin':
      return '/admin';
    case 'business':
      return '/business/dashboard';
    default:
      return '/';
  }
}
