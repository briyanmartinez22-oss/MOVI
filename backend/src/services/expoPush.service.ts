import { env } from '../config/env';

export type ExpoPushPayload = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
};

export type ExpoPushSendResult = {
  sent: number;
  failed: number;
  mode: 'expo';
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

function isExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

export async function sendExpoPushMessages(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<ExpoPushSendResult> {
  const validTokens = tokens.filter(isExpoPushToken);
  if (!validTokens.length) {
    return { sent: 0, failed: 0, mode: 'expo' };
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < validTokens.length; i += CHUNK_SIZE) {
    const chunk = validTokens.slice(i, i + CHUNK_SIZE);
    const messages: ExpoPushPayload[] = chunk.map((token) => ({
      to: token,
      title,
      body,
      data: data ?? {},
      sound: 'default',
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(env.expoAccessToken ? { Authorization: `Bearer ${env.expoAccessToken}` } : {}),
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        failed += chunk.length;
        continue;
      }

      const payload = (await res.json()) as {
        data?: Array<{ status?: string }>;
      };

      const results = payload.data ?? [];
      for (const item of results) {
        if (item.status === 'ok') sent += 1;
        else failed += 1;
      }

      if (!results.length) {
        sent += chunk.length;
      }
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed, mode: 'expo' };
}
