export type VehicleInviteErrorCode =
  | 'INVITE_INVALID'
  | 'INVITE_EXPIRED'
  | 'INVITE_USED'
  | 'OWNER_SUSPENDED'
  | 'VEHICLE_DISABLED';

export const VEHICLE_INVITE_ERROR_MESSAGES: Record<VehicleInviteErrorCode, string> = {
  INVITE_INVALID: 'Código de invitación inválido o no disponible.',
  INVITE_EXPIRED: 'Este código de invitación expiró.',
  INVITE_USED: 'Este código de invitación ya fue utilizado.',
  OWNER_SUSPENDED: 'El dueño de esta unidad está suspendido.',
  VEHICLE_DISABLED: 'Esta unidad no está disponible para registro.',
};

export function inviteFailure(code: VehicleInviteErrorCode, error?: string) {
  return {
    ok: false as const,
    code,
    error: error ?? VEHICLE_INVITE_ERROR_MESSAGES[code],
  };
}
