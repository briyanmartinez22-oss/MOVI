import type { Notification, NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { stringifyJsonField } from '../utils/normalize';
import { getNotificationProvider, TRIP_PUSH_EVENTS } from './notificationProvider';

export async function registerPushToken(userId: string, token: string, platform: string, deviceId?: string) {
  return prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform, deviceId },
    update: { userId, platform, deviceId, isActive: true, updatedAt: new Date() },
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
  if (!tokens.length) return { sent: 0, mode: 'none' as const };

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
  eventKey?: string,
  extra?: Record<string, unknown>
) {
  await createNotification(userId, type, title, body, { event: eventKey, ...extra });
  void dispatchPush(userId, title, body, eventKey ? { event: eventKey } : undefined).catch((err) => {
    console.warn('[notifyUser] push dispatch failed:', err);
  });
}

export { TRIP_PUSH_EVENTS };
