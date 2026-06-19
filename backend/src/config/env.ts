import { z } from 'zod';

const port = Number(process.env.PORT ?? 3001);
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://movi:movi@localhost:5432/movi?schema=public';

function resolveStorageProvider(): 'local' | 's3' | 'cloudinary' {
  const explicit = process.env.STORAGE_PROVIDER?.toLowerCase();
  if (explicit === 'cloudinary' || explicit === 's3' || explicit === 'local') {
    return explicit;
  }
  if (process.env.STORAGE_MODE === 's3') return 's3';
  return 'local';
}

function resolveMapsProvider(): 'fallback' | 'google' | 'mapbox' {
  const explicit = process.env.MAPS_PROVIDER?.toLowerCase();
  if (explicit === 'google' || explicit === 'mapbox' || explicit === 'fallback') {
    return explicit;
  }
  if (process.env.GOOGLE_MAPS_API_KEY) return 'google';
  if (process.env.MAPBOX_ACCESS_TOKEN) return 'mapbox';
  return 'fallback';
}

function resolveOtpProvider(): 'demo' | 'twilio' {
  const explicit = process.env.OTP_PROVIDER?.toLowerCase();
  if (explicit === 'demo' || explicit === 'twilio') return explicit;
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production') return 'twilio';
  return 'demo';
}

function resolvePushProvider(): 'none' | 'expo' | 'firebase' {
  const explicit = process.env.PUSH_PROVIDER?.toLowerCase();
  if (explicit === 'expo' || explicit === 'firebase' || explicit === 'none') return explicit;
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) return 'firebase';
  return 'none';
}

export const env = {
  port: Number.isFinite(port) ? port : 3001,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  demoOtpCode: process.env.DEMO_OTP_CODE ?? '123456',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl,
  databaseProvider: 'postgresql' as const,
  publicUrl: process.env.PUBLIC_URL,

  storageProvider: resolveStorageProvider(),
  /** @deprecated use storageProvider === 's3' */
  storageMode: process.env.STORAGE_MODE ?? 'local',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  awsS3Bucket: process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET,
  awsAccessKeyId: process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  awsS3PublicUrlPrefix: process.env.AWS_S3_PUBLIC_URL_PREFIX,

  mapsProvider: resolveMapsProvider(),
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,

  otpProvider: resolveOtpProvider(),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,

  pushProvider: resolvePushProvider(),
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
} as const;

export function assertEnv() {
  if (env.nodeEnv === 'production') {
    if (env.jwtSecret === 'dev-secret-change-me' || env.jwtSecret === 'change-me-in-production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    if (!env.databaseUrl.startsWith('postgresql://') && !env.databaseUrl.startsWith('postgres://')) {
      throw new Error('Production requires PostgreSQL (DATABASE_URL=postgresql://...)');
    }
    if (env.otpProvider === 'demo') {
      throw new Error('OTP_PROVIDER=demo is not allowed in production');
    }
  }
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret
  );
}

export function isS3Configured(): boolean {
  return Boolean(env.awsS3Bucket && env.awsAccessKeyId && env.awsSecretAccessKey);
}

export function isTwilioConfigured(): boolean {
  return Boolean(env.twilioAccountSid && env.twilioAuthToken);
}

export function isTwilioVerifyConfigured(): boolean {
  return Boolean(isTwilioConfigured() && env.twilioVerifyServiceSid);
}

export function isTwilioSmsConfigured(): boolean {
  return Boolean(isTwilioConfigured() && env.twilioFromNumber);
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(env.googleMapsApiKey);
}

export function isMapboxConfigured(): boolean {
  return Boolean(env.mapboxAccessToken);
}

export function isExpoPushConfigured(): boolean {
  return env.pushProvider === 'expo';
}

export function isFirebasePushConfigured(): boolean {
  return Boolean(
    env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey
  );
}

export function getResolvedStorageMode(): 'local' | 's3' | 'cloudinary' {
  if (env.storageProvider === 'cloudinary' && isCloudinaryConfigured()) return 'cloudinary';
  if (env.storageProvider === 's3' && isS3Configured()) return 's3';
  return 'local';
}

export function getResolvedMapsMode(): 'fallback' | 'google' | 'mapbox' {
  if (env.mapsProvider === 'google' && isGoogleMapsConfigured()) return 'google';
  if (env.mapsProvider === 'mapbox' && isMapboxConfigured()) return 'mapbox';
  return 'fallback';
}

export function getResolvedOtpMode(): 'demo' | 'twilio' {
  if (env.otpProvider === 'demo') {
    return env.nodeEnv === 'production' ? 'twilio' : 'demo';
  }
  if (isTwilioConfigured()) return 'twilio';
  return env.nodeEnv === 'production' ? 'twilio' : 'demo';
}

export function getResolvedPushMode(): 'none' | 'expo' | 'firebase' {
  if (env.pushProvider === 'firebase' && isFirebasePushConfigured()) return 'firebase';
  if (env.pushProvider === 'expo') return 'expo';
  if (env.pushProvider === 'firebase') return 'none';
  return 'none';
}

export const phoneSchema = z.string().min(8);
export const duiSchema = z.string().min(5);
export const otpSchema = z.string().min(4).max(8);
