import { prisma } from '../lib/prisma';
import { requestOtp } from './otpService';
import { writeAdminAudit } from './audit.service';

type AdminContext = {
  adminUserId: string;
  actorRole?: string | null;
};

/** Envía OTP al dueño para crear o restablecer contraseña (SUPER_ADMIN / compliance). */
export async function triggerOwnerPasswordReset(ownerId: string, ctx: AdminContext) {
  const owner = await prisma.owner.findUnique({
    where: { id: ownerId },
    include: { user: { select: { id: true, phoneNumber: true, passwordHash: true, role: true } } },
  });
  if (!owner) return { ok: false as const, error: 'Dueño no encontrado' };
  if (owner.user.role === 'admin') {
    return { ok: false as const, error: 'Las cuentas admin usan OTP administrativo' };
  }

  const otpResult = await requestOtp(owner.user.phoneNumber);
  if (!otpResult.ok) return otpResult;

  await writeAdminAudit({
    userId: ctx.adminUserId,
    actorRole: ctx.actorRole ?? undefined,
    action: 'update',
    entityType: 'owner',
    entityId: ownerId,
    changes: {
      triggerPasswordReset: true,
      targetUserId: owner.user.id,
      phone: owner.user.phoneNumber,
      hadPasswordHash: Boolean(owner.user.passwordHash),
    },
  });

  return {
    ok: true as const,
    sent: true,
    phone: owner.user.phoneNumber,
    hasPasswordHash: Boolean(owner.user.passwordHash),
    message: owner.user.passwordHash
      ? 'OTP enviado para restablecer contraseña.'
      : 'OTP enviado para que el dueño cree su contraseña por primera vez.',
  };
}
