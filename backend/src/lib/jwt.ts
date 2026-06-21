import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthTokenPayload {
  userId: string;
  role: string;
}

export interface OtpVerificationPayload {
  phone: string;
  purpose: 'otp-verified';
}

export interface AuthTokens {
  authToken: string;
  refreshToken: string;
  expiresIn: number;
}

const ACCESS_TTL = '1h';

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: ACCESS_TTL });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

const OTP_VERIFICATION_TTL = '15m';

export function signOtpVerificationToken(phone: string): string {
  const payload: OtpVerificationPayload = { phone, purpose: 'otp-verified' };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: OTP_VERIFICATION_TTL });
}

export function verifyOtpVerificationToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as OtpVerificationPayload;
    if (payload.purpose !== 'otp-verified' || typeof payload.phone !== 'string') {
      return null;
    }
    return payload.phone;
  } catch {
    return null;
  }
}
