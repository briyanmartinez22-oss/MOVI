import { env, isTwilioConfigured } from '../config/env';

export interface SmsProvider {
  sendSms(phone: string, message: string): Promise<void>;
  isDemoMode: boolean;
}

function createDemoProvider(): SmsProvider {
  return {
    isDemoMode: true,
    async sendSms(phone, message) {
      console.log(`[SMS DEMO] To: ${phone}`);
      console.log(`[SMS DEMO] Message: ${message}`);
    },
  };
}

async function createTwilioProvider(): Promise<SmsProvider> {
  const twilio = await import('twilio');
  const client = twilio.default(env.twilioAccountSid!, env.twilioAuthToken!);

  return {
    isDemoMode: false,
    async sendSms(phone, message) {
      await client.messages.create({
        body: message,
        from: env.twilioFromNumber!,
        to: phone,
      });
    },
  };
}

let cachedProvider: SmsProvider | null = null;

export async function getSmsProvider(): Promise<SmsProvider> {
  if (cachedProvider) return cachedProvider;

  if (isTwilioConfigured()) {
    cachedProvider = await createTwilioProvider();
    console.log('SMS provider: Twilio');
  } else {
    cachedProvider = createDemoProvider();
    console.log('SMS provider: demo (console log)');
  }

  return cachedProvider;
}

export function generateOtpCode(): string {
  if (!isTwilioConfigured()) {
    return env.demoOtpCode;
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}
