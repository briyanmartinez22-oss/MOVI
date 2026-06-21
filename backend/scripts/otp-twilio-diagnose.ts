#!/usr/bin/env tsx
/**
 * Diagnóstico OTP Twilio — no imprime secretos completos.
 */
import 'dotenv/config';
import {
  env,
  getResolvedOtpMode,
  isTwilioConfigured,
  isTwilioVerifyConfigured,
} from '../src/config/env';
import { getOtpProvider } from '../src/services/otpProvider';

const PHONE = process.env.TEST_OTP_PHONE ?? '+12144698637';

function mask(v: string | undefined): string {
  if (!v) return '(unset)';
  if (v.length <= 6) return '***';
  return `${v.slice(0, 4)}...${v.slice(-4)} (len=${v.length})`;
}

async function main() {
  console.log('=== process.env (OTP/Twilio) ===');
  console.log('NODE_ENV:', process.env.NODE_ENV ?? '(unset)');
  console.log('OTP_PROVIDER:', process.env.OTP_PROVIDER ?? '(unset)');
  console.log('TWILIO_ACCOUNT_SID:', mask(process.env.TWILIO_ACCOUNT_SID));
  console.log('TWILIO_AUTH_TOKEN:', mask(process.env.TWILIO_AUTH_TOKEN));
  console.log('TWILIO_VERIFY_SERVICE_SID:', mask(process.env.TWILIO_VERIFY_SERVICE_SID));
  console.log('TWILIO_FROM_NUMBER:', process.env.TWILIO_FROM_NUMBER ?? '(unset)');
  console.log('PUBLIC_URL:', process.env.PUBLIC_URL ?? '(unset)');
  console.log('RAILWAY_*:', Object.keys(process.env).filter((k) => k.startsWith('RAILWAY')).join(',') || '(none)');

  console.log('\n=== env.ts resuelto ===');
  console.log('env.nodeEnv:', env.nodeEnv);
  console.log('env.otpProvider (requested):', env.otpProvider);
  console.log('getResolvedOtpMode():', getResolvedOtpMode());
  console.log('isTwilioConfigured():', isTwilioConfigured());
  console.log('isTwilioVerifyConfigured():', isTwilioVerifyConfigured());

  const provider = await getOtpProvider();
  console.log('\n=== getOtpProvider() ===');
  console.log('mode:', provider.mode);
  console.log('isDemoMode:', provider.isDemoMode);

  console.log('\n=== sendOtp prueba ===', PHONE);
  const result = await provider.sendOtp(PHONE);
  console.log('sendOtp result:', JSON.stringify(result, null, 2));

  if (provider.mode === 'twilio' && isTwilioVerifyConfigured()) {
    try {
      const twilio = await import('twilio');
      const client = twilio.default(env.twilioAccountSid!, env.twilioAuthToken!);
      console.log('\n=== Twilio Verify API (verifications.create) ===');
      const verification = await client.verify.v2
        .services(env.twilioVerifyServiceSid!)
        .verifications.create({ to: PHONE, channel: 'sms' });
      console.log('Twilio response:', JSON.stringify({
        sid: verification.sid,
        status: verification.status,
        to: verification.to,
        channel: verification.channel,
        valid: verification.valid,
      }, null, 2));
    } catch (err: unknown) {
      const e = err as { message?: string; code?: number; status?: number; moreInfo?: string };
      console.error('\n=== Twilio ERROR ===');
      console.error('message:', e.message);
      console.error('code:', (err as { code?: unknown }).code);
      console.error('status:', (err as { status?: unknown }).status);
      console.error('moreInfo:', (err as { moreInfo?: unknown }).moreInfo);
      if (err instanceof Error && 'stack' in err) console.error('stack:', err.stack?.split('\n').slice(0, 3).join('\n'));
    }
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
