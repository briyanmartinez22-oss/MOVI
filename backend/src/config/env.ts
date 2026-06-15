import { z } from 'zod';

const port = Number(process.env.PORT ?? 3001);
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://movi:movi@localhost:5432/movi?schema=public';

export const env = {
  port: Number.isFinite(port) ? port : 3001,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  demoOtpCode: process.env.DEMO_OTP_CODE ?? '123456',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl,
  databaseProvider: 'postgresql' as const,
  storageMode: process.env.STORAGE_MODE ?? 'local',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
  awsS3Bucket: process.env.AWS_S3_BUCKET,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  awsS3PublicUrlPrefix: process.env.AWS_S3_PUBLIC_URL_PREFIX,
  publicUrl: process.env.PUBLIC_URL,
} as const;

export function assertEnv() {
  if (env.nodeEnv === 'production') {
    if (env.jwtSecret === 'dev-secret-change-me' || env.jwtSecret === 'change-me-in-production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    if (!env.databaseUrl.startsWith('postgresql://') && !env.databaseUrl.startsWith('postgres://')) {
      throw new Error('Production requires PostgreSQL (DATABASE_URL=postgresql://...)');
    }
  }
}

export function isTwilioConfigured(): boolean {
  return Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber);
}

export function isS3Configured(): boolean {
  return Boolean(
    env.storageMode === 's3' &&
      env.awsS3Bucket &&
      env.awsAccessKeyId &&
      env.awsSecretAccessKey
  );
}

export const phoneSchema = z.string().min(8);
export const duiSchema = z.string().min(5);
export const otpSchema = z.string().min(4).max(8);
