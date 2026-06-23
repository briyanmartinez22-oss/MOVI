import { prisma } from '../lib/prisma';
import { issueRefreshToken } from '../lib/refreshToken';
import { revokeAllRefreshTokensForUser } from '../lib/refreshToken';
import { signAuthToken } from '../lib/jwt';
import { normalizePhone } from '../utils/phone';
import { toAuthUser } from '../utils/normalize';
import { findUserByPhone } from './ensure-super-admin.service';
import {
  hashPassword,
  validatePasswordPair,
  verifyPassword,
} from './password.service';
import {
  clearLoginFailures,
  GENERIC_LOGIN_ERROR,
  isLoginLocked,
  recordLoginFailure,
} from './login-lockout.service';
import { writeAuditLog } from './audit.service';
import { requestOtp, verifyOtp } from './otpService';
import { assertOtpValidForLogin } from './otpService';
import { duiMatches } from '../utils/normalize';

async function issueAuthBundle(userId: string, role: string) {
  const authToken = signAuthToken({ userId, role });
  const refresh = await issueRefreshToken(userId);
  return { authToken, refreshToken: refresh.refreshToken };
}

async function enrichAuthUser(user: {
  id: string;
  fullName: string;
  phoneNumber: string;
  duiNumber: string | null;
  role: string;
  phoneVerified: boolean;
  passwordHash: string | null;
  profilePhoto: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const authUser = toAuthUser(user);
  if (user.role === 'admin') {
    const { getAdminStaffRole } = await import('./admin-staff.service');
    return { ...authUser, staffRole: await getAdminStaffRole(user.id) };
  }
  return authUser;
}

export async function loginWithPassword(phone: string, password: string) {
  const phoneInput = phone.trim();
  const phoneNumber = normalizePhone(phoneInput);

  if (process.env.AUTH_LOGIN_DEBUG === '1') {
    console.info('[auth/login] password attempt', {
      phoneInput,
      phoneNormalized: phoneNumber || '(invalid)',
    });
  }

  if (!phoneNumber) {
    return { ok: false as const, error: 'Número de teléfono inválido', code: 'INVALID_PHONE' as const };
  }

  const user = await findUserByPhone(phoneNumber);

  if (process.env.AUTH_LOGIN_DEBUG === '1') {
    console.info('[auth/login] lookup', {
      phoneNormalized: phoneNumber,
      userFound: Boolean(user),
      hasPasswordHash: Boolean(user?.passwordHash),
      role: user?.role ?? null,
    });
  }

  if (isLoginLocked(phoneNumber)) {
    return {
      ok: false as const,
      error: 'Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.',
      code: 'LOGIN_LOCKED' as const,
    };
  }

  const fail = () => {
    recordLoginFailure(phoneNumber);
    return { ok: false as const, error: GENERIC_LOGIN_ERROR };
  };

  if (!user || !user.passwordHash) {
    if (user && !user.passwordHash && user.role !== 'admin') {
      recordLoginFailure(phoneNumber);
      return {
        ok: false as const,
        error: 'Debes crear una contraseña antes de iniciar sesión.',
        code: 'SET_PASSWORD_REQUIRED' as const,
      };
    }
    return fail();
  }

  if (user.role === 'admin') {
    return {
      ok: false as const,
      error: 'Las cuentas administrativas usan verificación OTP. Usa acceso administrador.',
      code: 'ADMIN_OTP_REQUIRED' as const,
    };
  }

  if (user.accountStatus === 'suspended') {
    return { ok: false as const, error: 'Tu cuenta está suspendida. Contacta soporte.' };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (process.env.AUTH_LOGIN_DEBUG === '1') {
    console.info('[auth/login] password match', { phoneNormalized: phoneNumber, passwordMatch: valid });
  }

  if (!valid) {
    return fail();
  }

  clearLoginFailures(phoneNumber);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneVerified: true,
      ...(user.phoneNumber !== phoneNumber ? { phoneNumber } : {}),
    },
  });

  await writeAuditLog({
    userId: user.id,
    actorRole: user.role,
    action: 'login',
    entityType: 'user',
    entityId: user.id,
    changes: { method: 'password' },
  });

  const authUser = await enrichAuthUser({ ...updated, passwordHash: user.passwordHash });
  const tokens = await issueAuthBundle(updated.id, updated.role);
  return { ok: true as const, user: authUser, ...tokens };
}

/** OTP login — solo cuentas admin (SUPER_ADMIN y staff). */
export async function loginWithOtpAdmin(phone: string, dui: string | undefined, code: string) {
  const verify = await assertOtpValidForLogin(phone, code);
  if (!verify.ok) return verify;

  const phoneNumber = normalizePhone(phone);
  const user = await findUserByPhone(phone);

  if (!user) {
    return { ok: false as const, error: 'Usuario no registrado. Completa el registro.' };
  }

  if (user.role !== 'admin') {
    return {
      ok: false as const,
      error: 'Inicia sesión con tu teléfono y contraseña.',
      code: 'PASSWORD_LOGIN_REQUIRED' as const,
    };
  }

  if (user.accountStatus === 'suspended') {
    return { ok: false as const, error: 'Tu cuenta está suspendida. Contacta soporte.' };
  }

  if (!dui?.trim()) {
    return { ok: false as const, error: 'El DUI es requerido para acceso administrativo.' };
  }
  if (!user.duiNumber || !duiMatches(user.duiNumber, dui)) {
    return { ok: false as const, error: 'El DUI no coincide con el registrado.' };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerified: true },
  });

  await writeAuditLog({
    userId: user.id,
    actorRole: 'admin',
    action: 'login',
    entityType: 'user',
    entityId: user.id,
    changes: { method: 'otp_admin' },
  });

  const authUser = await enrichAuthUser({ ...updated, passwordHash: user.passwordHash });
  const tokens = await issueAuthBundle(updated.id, updated.role);
  return { ok: true as const, user: authUser, ...tokens };
}

export async function forgotPassword(phone: string) {
  const phoneNumber = normalizePhone(phone);
  if (!phoneNumber) {
    return { ok: false as const, error: 'Número de teléfono inválido' };
  }
  // No revelar si el usuario existe — siempre intentar enviar OTP
  const otpResult = await requestOtp(phone);
  if (!otpResult.ok) return otpResult;
  return { ok: true as const, sent: true };
}

export async function resetPassword(
  phone: string,
  code: string,
  password: string,
  confirmPassword: string
) {
  const pairError = validatePasswordPair(password, confirmPassword);
  if (pairError) return { ok: false as const, error: pairError };

  const verify = await verifyOtp(phone, code);
  if (!verify.ok) return verify;

  const user = await findUserByPhone(phone);
  if (!user || user.role === 'admin') {
    return { ok: false as const, error: GENERIC_LOGIN_ERROR };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordSetAt: new Date(), phoneVerified: true },
  });

  await revokeAllRefreshTokensForUser(user.id);
  clearLoginFailures(normalizePhone(phone));

  await writeAuditLog({
    userId: user.id,
    actorRole: user.role,
    action: 'update',
    entityType: 'user',
    entityId: user.id,
    changes: { passwordReset: true },
  });

  return { ok: true as const, reset: true };
}

export async function setInitialPassword(
  phone: string,
  code: string,
  password: string,
  confirmPassword: string
) {
  const pairError = validatePasswordPair(password, confirmPassword);
  if (pairError) return { ok: false as const, error: pairError };

  const verify = await verifyOtp(phone, code);
  if (!verify.ok) return verify;

  const user = await findUserByPhone(phone);
  if (!user || user.role === 'admin') {
    return { ok: false as const, error: GENERIC_LOGIN_ERROR };
  }

  if (user.passwordHash) {
    return { ok: false as const, error: 'Esta cuenta ya tiene contraseña. Usa recuperar contraseña.' };
  }

  const passwordHash = await hashPassword(password);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordSetAt: new Date(), phoneVerified: true },
  });

  clearLoginFailures(normalizePhone(phone));

  await writeAuditLog({
    userId: user.id,
    actorRole: user.role,
    action: 'update',
    entityType: 'user',
    entityId: user.id,
    changes: { passwordSet: true },
  });

  const authUser = await enrichAuthUser({ ...updated, passwordHash });
  const tokens = await issueAuthBundle(updated.id, updated.role);
  return { ok: true as const, user: authUser, ...tokens };
}
