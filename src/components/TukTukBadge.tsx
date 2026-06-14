import { VehicleBadge } from './VehicleBadge';

/** @deprecated Use VehicleBadge — kept for backward compatibility */
export function TukTukBadge({ compact = false }: { compact?: boolean }) {
  return <VehicleBadge type="tuk_tuk_red" compact={compact} />;
}
