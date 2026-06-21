import type { Notification, NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { stringifyJsonField } from '../utils/normalize';
import { getNotificationProvider } from './notificationProvider';

export const TRIP_PUSH_TYPES = {
  tripRequest: 'trip_request',
  offerCreated: 'offer_created',
  tripAccepted: 'trip_accepted',
  driverArriving: 'driver_arriving',
  driverArrived: 'driver_arrived',
  tripStarted: 'trip_started',
  tripCompleted: 'trip_completed',
  tripCancelled: 'trip_cancelled',
  newMessage: 'new_message',
} as const;

export type TripPushType = (typeof TRIP_PUSH_TYPES)[keyof typeof TRIP_PUSH_TYPES];

/** @deprecated use TRIP_PUSH_TYPES */
export const TRIP_PUSH_EVENTS = TRIP_PUSH_TYPES;

function buildPushData(
  type: TripPushType,
  extra?: Record<string, unknown>
): Record<string, string> {
  const data: Record<string, string> = { type };
  if (extra?.tripId != null) data.tripId = String(extra.tripId);
  if (extra?.offerId != null) data.offerId = String(extra.offerId);
  return data;
}

export async function registerPushToken(userId: string, token: string, platform: string, deviceId?: string) {
  return prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform, deviceId },
    update: { userId, platform, deviceId, isActive: true, updatedAt: new Date() },
  });
}

export async function deactivatePushTokensForUser(userId: string, token?: string) {
  if (token) {
    await prisma.pushToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
    return;
  }
  await prisma.pushToken.updateMany({
    where: { userId },
    data: { isActive: false },
  });
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      dataJson: stringifyJsonField(data ?? {}),
    },
  });
}

export async function listNotifications(userId: string, limit = 50) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map((n: Notification) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    readAt: n.readAt?.toISOString(),
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function dispatchPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const tokens = await prisma.pushToken.findMany({
    where: { userId, isActive: true },
    select: { token: true },
  });
  if (!tokens.length) return { sent: 0, failed: 0, mode: 'none' as const };

  const provider = await getNotificationProvider();
  return provider.sendPush(
    tokens.map((t) => t.token),
    title,
    body,
    data
  );
}

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  pushType: TripPushType,
  extra?: Record<string, unknown>
) {
  const payload = { type: pushType, ...extra };
  await createNotification(userId, type, title, body, payload);
  void dispatchPush(userId, title, body, buildPushData(pushType, extra)).catch((err) => {
    console.warn('[notifyUser] push dispatch failed:', err);
  });
}
