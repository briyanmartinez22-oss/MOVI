import { env, getResolvedPushMode, isFirebasePushConfigured } from '../config/env';

export type PushSendResult = {
  sent: number;
  failed: number;
  mode: 'none' | 'expo' | 'firebase';
};

export interface NotificationProvider {
  mode: 'none' | 'expo' | 'firebase';
  sendPush(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<PushSendResult>;
}

function createNoneProvider(): NotificationProvider {
  return {
    mode: 'none',
    async sendPush(tokens, title, body) {
      if (tokens.length > 0) {
        console.log(`[PUSH none] tokens=${tokens.length} title=${title} body=${body}`);
      }
      return { sent: 0, failed: 0, mode: 'none' };
    },
  };
}

function createExpoProvider(): NotificationProvider {
  return {
    mode: 'expo',
    async sendPush(tokens, title, body, data) {
      let sent = 0;
      let failed = 0;

      for (const token of tokens) {
        try {
          const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              ...(env.expoAccessToken
                ? { Authorization: `Bearer ${env.expoAccessToken}` }
                : {}),
            },
            body: JSON.stringify({
              to: token,
              title,
              body,
              data: data ?? {},
              sound: 'default',
            }),
          });
          if (res.ok) sent += 1;
          else failed += 1;
        } catch {
          failed += 1;
        }
      }

      return { sent, failed, mode: 'expo' };
    },
  };
}

type FirebaseAdminModule = {
  apps: { length: number };
  initializeApp: (config: unknown) => unknown;
  credential: { cert: (config: unknown) => unknown };
  messaging: () => {
    sendEachForMulticast: (msg: {
      tokens: string[];
      notification: { title: string; body: string };
      data?: Record<string, string>;
    }) => Promise<{ successCount: number; failureCount: number }>;
  };
};

async function loadFirebaseAdmin(): Promise<FirebaseAdminModule | null> {
  try {
    return (await new Function('return import("firebase-admin")')()) as FirebaseAdminModule;
  } catch {
    return null;
  }
}

async function createFirebaseProvider(): Promise<NotificationProvider> {
  try {
    const admin = await loadFirebaseAdmin();
    if (!admin) {
      console.warn('Firebase push unavailable: firebase-admin not installed');
      return createNoneProvider();
    }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId!,
        clientEmail: env.firebaseClientEmail!,
        privateKey: env.firebasePrivateKey!,
      }),
    });
  }

  return {
    mode: 'firebase',
    async sendPush(tokens, title, body, data) {
      if (!tokens.length) return { sent: 0, failed: 0, mode: 'firebase' };

      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data ?? {},
      });

      return {
        sent: res.successCount,
        failed: res.failureCount,
        mode: 'firebase',
      };
    },
  };
  } catch (err) {
    console.warn('Firebase push unavailable:', err);
    return createNoneProvider();
  }
}

let cachedProvider: NotificationProvider | null = null;

export async function getNotificationProvider(): Promise<NotificationProvider> {
  if (cachedProvider) return cachedProvider;

  const mode = getResolvedPushMode();

  try {
    if (mode === 'firebase' && isFirebasePushConfigured()) {
      cachedProvider = await createFirebaseProvider();
      console.log('Push provider: Firebase');
    } else if (mode === 'expo') {
      cachedProvider = createExpoProvider();
      console.log('Push provider: Expo');
    } else {
      if (env.pushProvider !== 'none' && env.nodeEnv !== 'test') {
        console.warn(`Push provider: none (requested ${env.pushProvider}, credentials missing)`);
      } else {
        console.log('Push provider: none (in-app only)');
      }
      cachedProvider = createNoneProvider();
    }
  } catch (err) {
    console.warn('Push provider failed, using none:', err);
    cachedProvider = createNoneProvider();
  }

  return cachedProvider;
}

export const TRIP_PUSH_EVENTS = {
  newRequest: 'new_request',
  newOffer: 'new_offer',
  offerAccepted: 'offer_accepted',
  driverArrived: 'driver_arrived',
  tripStarted: 'trip_started',
  tripCompleted: 'trip_completed',
  newMessage: 'new_message',
} as const;
