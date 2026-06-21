import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  extractPushData,
  getNavigationTarget,
  syncPushTokenAfterAuth,
} from '../services/pushNotificationService';
import { useMockApi } from '../services/api/config';

export function PushNotificationManager() {
  const router = useRouter();
  const { user } = useAuth();
  const lastHandledId = useRef<string | null>(null);

  useEffect(() => {
    if (useMockApi() || Platform.OS === 'web') return;

    if (user) {
      void syncPushTokenAfterAuth();
    }
  }, [user?.userId]);

  useEffect(() => {
    if (useMockApi() || Platform.OS === 'web') return;

    const navigateFromNotification = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (lastHandledId.current === id) return;
      lastHandledId.current = id;

      const data = extractPushData(response.notification.request.content);
      const target = getNavigationTarget(data, user?.role);
      if (target) {
        router.push(target as never);
      }
    };

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = extractPushData(notification.request.content);
      if (__DEV__) {
        console.log('[push] foreground notification', data);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      navigateFromNotification(response);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router, user?.role]);

  return null;
}
