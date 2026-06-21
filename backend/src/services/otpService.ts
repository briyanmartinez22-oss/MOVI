import { prisma } from '../lib/prisma';
import { env, isTwilioVerifyConfigured } from '../config/env';
import { signOtpVerificationToken, verifyOtpVerificationToken } from '../lib/jwt';
import { isValidMoviPhone, normalizePhone } from '../utils/phone';
import { checkRateLimit } from './rateLimit.service';
import { generateOtpCode, getOtpProvider } from './otpProvider';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RATE_MAX = 5;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;

async function findActiveVerifiedChallenge(phoneNumber: string) {
  return prisma.otpChallenge.findFirst({
    where: {
      phoneNumber,
      verified: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function requestOtp(phone: string) {
  const phoneNumber = normalizePhone(phone);
  if (!isValidMoviPhone(phone)) {
    return { ok: false as const, error: 'Número de teléfono inválido' };
  }

  if (!checkRateLimit(`otp:${phoneNumber}`, OTP_RATE_MAX, OTP_RATE_WINDOW_MS)) {
    return { ok: false as const, error: 'Demasiados intentos. Espera 15 minutos.' };
  }

  const otp = await getOtpProvider();
  const useTwilioVerify = otp.mode === 'twilio' && isTwilioVerifyConfigured();
  const code = useTwilioVerify ? 'twilio-verify' : generateOtpCode();

  await prisma.otpChallenge.deleteMany({
    where: { phoneNumber, verified: false },
  });

  const sendResult = await otp.sendOtp(phoneNumber, useTwilioVerify ? undefined : code);
  if (!sendResult.ok) {
    return { ok: false as const, error: sendResult.error ?? 'No se pudo enviar OTP' };
  }

  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.otpChallenge.create({
    data: {
      phoneNumber,
      code: useTwilioVerify ? 'twilio-verify' : code,
      expiresAt,
    },
  });

  return { ok: true as const, sent: true, demo: sendResult.demo };
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
  if (!isValidMoviPhone(phone)) {
    return { ok: false as const, error: 'Número de teléfono inválido' };
  }

  if (env.nodeEnv === 'production' && code === env.demoOtpCode) {
    return { ok: false as const, error: 'Código OTP inválido.' };
  }

  const otp = await getOtpProvider();
  const useTwilioVerify = otp.mode === 'twilio' && isTwilioVerifyConfigured();

  if (useTwilioVerify) {
    const providerCheck = await otp.verifyOtp(phoneNumber, code);
    if (!providerCheck.ok) {
      return { ok: false as const, error: providerCheck.error ?? 'Código OTP inválido.' };
    }
  } else {
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
  }

  const activeChallenge = await prisma.otpChallenge.findFirst({
    where: { phoneNumber, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (activeChallenge && !activeChallenge.verified) {
    await prisma.otpChallenge.update({
      where: { id: activeChallenge.id },
      data: { verified: true },
    });
  }

  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  return {
    ok: true as const,
    verified: true,
    isNewUser: !existing,
    existingRole: existing?.role ?? null,
    verificationToken: signOtpVerificationToken(phoneNumber),
  };
}

export async function assertPhoneVerifiedForRegistration(
  phone: string,
  verificationToken?: string
) {
  const phoneNumber = normalizePhone(phone);
  if (!isValidMoviPhone(phone)) {
    return { ok: false as const, error: 'Número de teléfono inválido' };
  }

  if (verificationToken) {
    const tokenPhone = verifyOtpVerificationToken(verificationToken);
    if (tokenPhone && tokenPhone === phoneNumber) {
      return { ok: true as const };
    }
  }

  const verified = await findActiveVerifiedChallenge(phoneNumber);
  if (!verified) {
    return {
      ok: false as const,
      error: 'Debes verificar tu teléfono con OTP antes de registrarte.',
    };
  }

  return { ok: true as const };
}

export async function consumeVerifiedOtp(phone: string) {
  const phoneNumber = normalizePhone(phone);
  await prisma.otpChallenge.deleteMany({ where: { phoneNumber } });
}

export async function assertOtpValidForLogin(phone: string, code: string) {
  const phoneNumber = normalizePhone(phone);
  const verifiedChallenge = await findActiveVerifiedChallenge(phoneNumber);
  if (verifiedChallenge) {
    return { ok: true as const };
  }

  const otp = await getOtpProvider();
  const useTwilioVerify = otp.mode === 'twilio' && isTwilioVerifyConfigured();

  if (useTwilioVerify) {
    const providerCheck = await otp.verifyOtp(phoneNumber, code);
    if (!providerCheck.ok) {
      return { ok: false as const, error: providerCheck.error ?? 'No hay OTP activo para este teléfono.' };
    }

    const activeChallenge = await prisma.otpChallenge.findFirst({
      where: { phoneNumber, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (activeChallenge && !activeChallenge.verified) {
      await prisma.otpChallenge.update({
        where: { id: activeChallenge.id },
        data: { verified: true },
      });
    }

    return { ok: true as const };
  }

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
