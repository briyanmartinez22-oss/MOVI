import { prisma } from '../lib/prisma';
import { isValidSalvadorPhone, normalizePhone } from '../utils/phone';
import { checkRateLimit } from './rateLimit.service';
import { generateOtpCode, getSmsProvider } from './smsProvider';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RATE_MAX = 5;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;

export async function requestOtp(phone: string) {
  const phoneNumber = normalizePhone(phone);
  if (!isValidSalvadorPhone(phone)) {
    return { ok: false as const, error: 'Número de teléfono inválido' };
  }

  if (!checkRateLimit(`otp:${phoneNumber}`, OTP_RATE_MAX, OTP_RATE_WINDOW_MS)) {
    return { ok: false as const, error: 'Demasiados intentos. Espera 15 minutos.' };
  }

  await prisma.otpChallenge.deleteMany({
    where: { phoneNumber, verified: false },
  });

  const sms = await getSmsProvider();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpChallenge.create({
    data: { phoneNumber, code, expiresAt },
  });

  const message = sms.isDemoMode
    ? `MOVI demo OTP: ${code}`
    : `Tu código MOVI es: ${code}. Válido por 10 minutos.`;

  await sms.sendSms(phoneNumber, message);

  return { ok: true as const, sent: true, demo: sms.isDemoMode };
}

async function findOtpChallenge(phoneNumber: string, code: string, requireUnverified: boolean) {
  return prisma.otpChallenge.findFirst({
    where: {
      phoneNumber,
      code,
      verified: requireUnverified ? false : undefined,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function verifyOtp(phone: string, code: string) {
  const phoneNumber = normalizePhone(phone);
  if (!isValidSalvadorPhone(phone)) {
    return { ok: false as const, error: 'Número de teléfono inválido' };
  }

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phoneNumber,
      code,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    const pending = await prisma.otpChallenge.findFirst({
      where: {
        phoneNumber,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) {
      return { ok: false as const, error: 'No hay OTP activo para este teléfono.' };
    }
    return { ok: false as const, error: 'Código OTP inválido.' };
  }

  if (!challenge.verified) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verified: true },
    });
  }

  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  return {
    ok: true as const,
    verified: true,
    isNewUser: !existing,
  };
}

/** Acepta OTP ya verificado en pantalla anterior (flujo login en 2 pasos). */
export async function assertOtpValidForLogin(phone: string, code: string) {
  const phoneNumber = normalizePhone(phone);
  const challenge = await findOtpChallenge(phoneNumber, code, false);

  if (!challenge) {
    return { ok: false as const, error: 'No hay OTP activo para este teléfono.' };
  }

  if (!challenge.verified) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verified: true },
    });
  }

  return { ok: true as const };
}
