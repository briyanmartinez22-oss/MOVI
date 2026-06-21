import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost } from './api/client';

const STORAGE_KEY = '@movi/help_analytics_queue';
const MAX_QUEUE = 100;

export type HelpAnalyticsEventName =
  | 'help_article_opened'
  | 'help_search'
  | 'help_contact_support';

export type HelpAnalyticsPayload = {
  event: HelpAnalyticsEventName;
  sectionId?: string;
  query?: string;
  channel?: string;
  subject?: string;
  timestamp: string;
};

async function readQueue(): Promise<HelpAnalyticsPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HelpAnalyticsPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: HelpAnalyticsPayload[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
}

async function flushToBackend(event: HelpAnalyticsPayload) {
  await apiPost('/help/analytics/events', event, { auth: false }).catch(() => undefined);
}

export async function trackHelpEvent(
  event: HelpAnalyticsEventName,
  meta: Omit<HelpAnalyticsPayload, 'event' | 'timestamp'> = {}
) {
  const payload: HelpAnalyticsPayload = {
    event,
    ...meta,
    timestamp: new Date().toISOString(),
  };

  if (__DEV__) {
    console.log('[help-analytics]', payload);
  }

  const queue = await readQueue();
  queue.push(payload);
  await writeQueue(queue);
  void flushToBackend(payload);
}

export function trackHelpArticleOpened(sectionId: string) {
  return trackHelpEvent('help_article_opened', { sectionId });
}

export function trackHelpSearch(query: string) {
  return trackHelpEvent('help_search', { query: query.trim().slice(0, 120) });
}

export function trackHelpContactSupport(input: {
  channel: string;
  subject?: string;
  sectionId?: string;
}) {
  return trackHelpEvent('help_contact_support', input);
}

export async function getHelpAnalyticsQueue(): Promise<HelpAnalyticsPayload[]> {
  return readQueue();
}
