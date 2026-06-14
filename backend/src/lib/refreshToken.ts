import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma';

const REFRESH_TTL_DAYS = 30;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export async function issueRefreshToken(userId: string, meta?: { userAgent?: string; deviceId?: string }) {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta?.userAgent,
      deviceId: meta?.deviceId,
    },
  });

  return { refreshToken: token, expiresAt };
}

export async function rotateRefreshToken(
  refreshToken: string,
  meta?: { userAgent?: string; deviceId?: string }
) {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return { ok: false as const, error: 'Refresh token inválido o expirado' };
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const next = await issueRefreshToken(stored.userId, meta);
  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) return { ok: false as const, error: 'Usuario no encontrado' };

  return { ok: true as const, userId: user.id, role: user.role, ...next };
}

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
