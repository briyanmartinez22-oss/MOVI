import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { apiPost } from './api/client';
import { useMockApi } from './api/config';

export type PushNotificationType =
  | 'trip_request'
  | 'offer_created'
  | 'trip_accepted'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'trip_cancelled'
  | 'trip_started'
  | 'trip_completed'
  | 'new_message';

export type PushNotificationData = {
  type?: PushNotificationType | string;
  tripId?: string;
  offerId?: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.slug
  );
}

export async function requestPushPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Device.isDevice) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (useMockApi()) return null;

  const granted = await requestPushPermissions();
  if (!granted) return null;

  const projectId = getExpoProjectId();
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined
    );
    return token.data;
  } catch (error) {
    console.warn('[push] No se pudo obtener Expo Push Token:', error);
    return null;
  }
}

export async function registerPushTokenWithBackend(token: string): Promise<boolean> {
  if (useMockApi()) return false;

  const platform =
    Platform.OS === 'ios'
      ? 'ios'
      : Platform.OS === 'android'
        ? 'android'
        : Platform.OS === 'web'
          ? 'web'
          : 'unknown';

  const deviceId =
    Constants.sessionId ??
    Constants.installationId ??
    Device.modelName ??
    undefined;

  const res = await apiPost<{ registered: boolean }>('/notifications/push-token', {
    token,
    platform,
    deviceId,
  });

  return res.ok === true;
}

export async function syncPushTokenAfterAuth(): Promise<void> {
  if (useMockApi()) return;
  const token = await getExpoPushToken();
  if (!token) return;
  await registerPushTokenWithBackend(token);
}

export function extractPushData(
  payload: Notifications.NotificationContent | Notifications.NotificationRequest['content']
): PushNotificationData {
  const raw = payload.data ?? {};
  return {
    type: typeof raw.type === 'string' ? raw.type : undefined,
    tripId: typeof raw.tripId === 'string' ? raw.tripId : undefined,
    offerId: typeof raw.offerId === 'string' ? raw.offerId : undefined,
  };
}

export function getNavigationTarget(data: PushNotificationData, role?: string): string | null {
  switch (data.type) {
    case 'trip_request':
      return '/driver';
    case 'offer_created':
      return data.tripId ? `/passenger/offers?tripId=${data.tripId}` : '/passenger/offers';
    case 'trip_accepted':
      if (role === 'driver') return data.tripId ? `/driver/trip-active?tripId=${data.tripId}` : '/driver/trip-active';
      return data.tripId ? `/passenger/trip?tripId=${data.tripId}` : '/passenger/trip';
    case 'driver_arriving':
    case 'driver_arrived':
      return data.tripId ? `/passenger/driver?tripId=${data.tripId}` : '/passenger/driver';
    case 'trip_cancelled':
      if (role === 'driver') return '/driver';
      return '/passenger';
    default:
      return '/notifications';
  }
}
