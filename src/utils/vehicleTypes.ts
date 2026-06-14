import { VehicleType } from '../types/models';
import { colors } from '../theme';

export interface VehicleTypeMeta {
  label: string;
  emoji: string;
  accentColor: string;
}

export const VEHICLE_TYPE_META: Record<VehicleType, VehicleTypeMeta> = {
  mototaxi: { label: 'Mototaxi', emoji: '🛺', accentColor: colors.tukRed },
  tuk_tuk_red: { label: 'Tuk-tuk rojo', emoji: '🛺', accentColor: colors.tukRed },
  qute: { label: 'Qute', emoji: '🚗', accentColor: colors.primary },
  motocicleta: { label: 'Motocicleta', emoji: '🏍️', accentColor: colors.warning },
  sedan: { label: 'Sedán', emoji: '🚙', accentColor: colors.textSecondary },
  camioneta: { label: 'Camioneta', emoji: '🚐', accentColor: colors.online },
  pickup: { label: 'Pickup', emoji: '🛻', accentColor: colors.online },
  camion: { label: 'Camión', emoji: '🚚', accentColor: colors.danger },
  microbus: { label: 'Microbús', emoji: '🚌', accentColor: colors.primary },
};

export const VEHICLE_TYPE_OPTIONS: VehicleType[] = [
  'mototaxi',
  'qute',
  'motocicleta',
  'sedan',
  'camioneta',
  'pickup',
  'camion',
  'microbus',
];

export function normalizeVehicleType(type?: VehicleType): VehicleType {
  if (!type || type === 'tuk_tuk_red') return 'mototaxi';
  return type;
}

export function getVehicleTypeMeta(type?: VehicleType): VehicleTypeMeta {
  const key = type ?? 'mototaxi';
  return VEHICLE_TYPE_META[key] ?? VEHICLE_TYPE_META.mototaxi;
}

export function isCargoVehicleType(type?: VehicleType): boolean {
  const normalized = normalizeVehicleType(type);
  return normalized === 'pickup' || normalized === 'camion' || normalized === 'camioneta';
}
