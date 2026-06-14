import type { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { stringifyJsonField } from '../utils/normalize';

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
  return rows.map((n) => ({
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

/** FCM/APNS dispatch placeholder — logs until credentials are configured */
export async function dispatchPush(userId: string, title: string, body: string) {
  const tokens = await prisma.pushToken.findMany({ where: { userId, isActive: true } });
  if (!tokens.length) return { sent: 0 };
  console.log(`[PUSH DEMO] user=${userId} tokens=${tokens.length} title=${title} body=${body}`);
  return { sent: tokens.length, mode: 'demo' };
}
