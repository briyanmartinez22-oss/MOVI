import { env, getResolvedOtpMode, isDemoOtpAllowed, isTwilioConfigured, isTwilioVerifyConfigured } from '../config/env';

export type OtpSendResult = {
  ok: boolean;
  demo: boolean;
  provider: 'demo' | 'twilio';
  error?: string;
};

export type OtpVerifyResult = {
  ok: boolean;
  error?: string;
};

export interface OtpProvider {
  mode: 'demo' | 'twilio';
  isDemoMode: boolean;
  sendOtp(phone: string, code?: string): Promise<OtpSendResult>;
  verifyOtp(phone: string, code: string): Promise<OtpVerifyResult>;
}

function createDemoProvider(): OtpProvider {
  return {
    mode: 'demo',
    isDemoMode: true,
    async sendOtp(_phone, code) {
      const otp = code ?? env.demoOtpCode;
      console.log(`[OTP DEMO] To: ${_phone} Code: ${otp}`);
      return { ok: true, demo: true, provider: 'demo' };
    },
    async verifyOtp(_phone, code) {
      if (env.nodeEnv === 'production' || !isDemoOtpAllowed()) {
        return { ok: false, error: 'OTP demo no permitido.' };
      }
      if (code === env.demoOtpCode) return { ok: true };
      return { ok: false, error: 'Código OTP inválido.' };
    },
  };
}

async function createTwilioProvider(): Promise<OtpProvider> {
  const twilio = await import('twilio');
  const client = twilio.default(env.twilioAccountSid!, env.twilioAuthToken!);
  const useVerify = isTwilioVerifyConfigured();

  return {
    mode: 'twilio',
    isDemoMode: false,
    async sendOtp(phone, code) {
      try {
        if (useVerify) {
          await client.verify.v2
            .services(env.twilioVerifyServiceSid!)
            .verifications.create({ to: phone, channel: 'sms' });
          return { ok: true, demo: false, provider: 'twilio' };
        }

        if (!env.twilioFromNumber) {
          return {
            ok: false,
            demo: false,
            provider: 'twilio',
            error: 'Twilio SMS no configurado (TWILIO_FROM_NUMBER requerido).',
          };
        }

        const otp = code ?? String(Math.floor(100000 + Math.random() * 900000));
        await client.messages.create({
          body: `Tu código MOVI es: ${otp}. Válido por 10 minutos.`,
          from: env.twilioFromNumber,
          to: phone,
        });
        return { ok: true, demo: false, provider: 'twilio' };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error enviando OTP';
        console.error('[OTP Twilio]', message);
        return { ok: false, demo: false, provider: 'twilio', error: `No se pudo enviar OTP: ${message}` };
      }
    },
    async verifyOtp(phone, code) {
      try {
        if (useVerify) {
          const check = await client.verify.v2
            .services(env.twilioVerifyServiceSid!)
            .verificationChecks.create({ to: phone, code });
          if (check.status === 'approved') return { ok: true };
          return { ok: false, error: 'Código OTP inválido.' };
        }
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error verificando OTP';
        return { ok: false, error: message };
      }
    },
  };
}

let cachedProvider: OtpProvider | null = null;

export async function getOtpProvider(): Promise<OtpProvider> {
  if (cachedProvider) return cachedProvider;

  const mode = getResolvedOtpMode();

  if (mode === 'twilio' && isTwilioConfigured()) {
    cachedProvider = await createTwilioProvider();
    console.log(
      `OTP provider: Twilio${isTwilioVerifyConfigured() ? ' Verify' : ' SMS'}`
    );
  } else {
    if (env.otpProvider === 'twilio' && env.nodeEnv === 'production') {
      throw new Error(
        'OTP_PROVIDER=twilio requiere TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en producción'
      );
    }
    if (env.otpProvider === 'twilio' && !isTwilioConfigured()) {
      console.warn('OTP provider: demo fallback (Twilio credentials missing)');
    } else {
      console.log('OTP provider: demo');
    }
    cachedProvider = createDemoProvider();
  }

  return cachedProvider;
}

export function generateOtpCode(): string {
  const mode = getResolvedOtpMode();
  if (mode === 'demo' && isDemoOtpAllowed()) return env.demoOtpCode;
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** @deprecated use getOtpProvider */
export async function getSmsProvider() {
  const otp = await getOtpProvider();
  return {
    isDemoMode: otp.isDemoMode,
    async sendSms(phone: string, message: string) {
      if (otp.isDemoMode) {
        console.log(`[SMS DEMO] To: ${phone}`);
        console.log(`[SMS DEMO] Message: ${message}`);
        return;
      }
      const twilio = await import('twilio');
      const client = twilio.default(env.twilioAccountSid!, env.twilioAuthToken!);
      await client.messages.create({
        body: message,
        from: env.twilioFromNumber!,
        to: phone,
      });
    },
  };
}
