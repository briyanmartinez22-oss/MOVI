import { Coordinates } from './index';

export type UserRole = 'passenger' | 'driver' | 'owner' | 'business' | 'admin';

export type BusinessType =
  | 'restaurant'
  | 'store'
  | 'pharmacy'
  | 'commerce'
  | 'startup'
  | 'other';

export type DeliveryCategory = 'food' | 'package' | 'documents' | 'shopping';

export type VehicleType =
  | 'mototaxi'
  | 'qute'
  | 'motocicleta'
  | 'sedan'
  | 'camioneta'
  | 'pickup'
  | 'camion'
  | 'microbus'
  /** @deprecated alias for mototaxi — kept for backward compatibility */
  | 'tuk_tuk_red';

export type ServiceType = 'movi_ride' | 'movi_delivery' | 'movi_cargo' | 'movi_business';

export type ServiceRequestType =
  | 'viaje'
  | 'entrega'
  | 'paqueteria'
  | 'carga'
  | 'mudanza'
  | 'transporte_animales'
  | 'transporte_grupal'
  | 'servicio_comercial';

export type SubscriptionStatus =
  | 'trial_until_next_month'
  | 'active'
  | 'past_due'
  | 'suspended';

export type PaymentMethodBrand =
  | 'visa_credit'
  | 'visa_debit'
  | 'mastercard_credit'
  | 'mastercard_debit';

export type PaymentProvider = 'wompi' | 'bac' | 'banco_agricola' | 'stripe' | 'mock';

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  businessType: BusinessType;
  responsibleDui: string;
  businessPhone: string;
  nit?: string;
  coordinates: { latitude: number; longitude: number };
  addressLabel: string;
  status: 'pending' | 'approved' | 'rejected';
  rating: number;
  totalDeliveries: number;
  createdAt: string;
}

export interface DriverSubscription {
  id: string;
  driverId: string;
  status: SubscriptionStatus;
  monthlyAmountUsd: number;
  registeredAt: string;
  trialEndsAt: string;
  nextBillingAt: string;
  paymentMethod?: PaymentMethodBrand;
  paymentProvider?: PaymentProvider;
  lastPaidAt?: string;
}

export interface DeliveryHistoryRecord {
  id: string;
  deliveryId: string;
  businessId: string;
  businessName: string;
  driverId: string;
  driverName: string;
  category: DeliveryCategory;
  originName: string;
  destinationName: string;
  distanceKm: number;
  price: number;
  durationMinutes: number;
  status: string;
  completedAt: string;
}

export interface PlatformMetrics {
  totalPassengers: number;
  totalDrivers: number;
  totalOwners: number;
  totalBusinesses: number;
  totalVehicles: number;
  totalTrips: number;
  totalDeliveries: number;
  kmSavedEstimate: number;
  monthlySubscriptionRevenue: number;
  driversOnTrial: number;
  driversActive: number;
  driversSuspended: number;
  peakHours: string[];
  peakDays: string[];
  hotZones: string[];
  avgArrivalMinutes: number;
  avgWaitMinutes: number;
  avgOfferedPrice: number;
  topRoutes: string[];
  activeDriversOnline?: number;
  mrr?: number;
  arr?: number;
  tripsToday?: number;
  tripsWeek?: number;
  tripsMonth?: number;
  deliveriesToday?: number;
  deliveriesWeek?: number;
  deliveriesMonth?: number;
  activeUsers?: number;
  driversPastDue?: number;
}

export interface ExecutiveKpis {
  mrr: number;
  arr: number;
  tripsToday: number;
  tripsWeek: number;
  tripsMonth: number;
  deliveriesToday: number;
  deliveriesWeek: number;
  deliveriesMonth: number;
  activeUsers: number;
  driversPastDue: number;
}

export type OwnerVerificationStatus =
  | 'pending'
  | 'documents_uploaded'
  | 'selfie_pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type VehicleVerificationStatus =
  | 'draft'
  | 'incomplete'
  | 'documents_uploaded'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type DriverVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type SpecialCaseType =
  | 'family_authorization'
  | 'company_owner'
  | 'financed_vehicle'
  | 'private_sale_contract'
  | 'power_of_attorney'
  | 'manual_review';

export interface AuthUser {
  userId: string;
  fullName: string;
  phoneNumber: string;
  duiNumber: string;
  role: UserRole;
  phoneVerified: boolean;
  passwordSet?: boolean;
  needsPasswordSet?: boolean;
  profilePhoto?: string;
  createdAt: string;
  updatedAt: string;
  /** Rol granular admin (solo usuarios role=admin). */
  staffRole?: 'SUPER_ADMIN' | 'OPS_ADMIN' | 'SUPPORT_ADMIN' | 'FINANCE_ADMIN' | 'COMPLIANCE_ADMIN';
}

/** @deprecated use AuthUser fields directly — kept for gradual migration */
export function authUserLegacy(user: AuthUser) {
  return {
    id: user.userId,
    name: user.fullName,
    phone: user.phoneNumber,
  };
}

export interface OwnerDocuments {
  duiFront?: string;
  duiBack?: string;
  selfie?: string;
  license?: string;
  registrationCard?: string;
}

export interface Owner {
  id: string;
  userId: string;
  name: string;
  phone: string;
  dui: string;
  status: OwnerVerificationStatus;
  documents: OwnerDocuments;
  specialCase?: SpecialCaseType;
  ownershipProofImage?: string;
  createdAt: string;
}

export interface VehicleDocuments {
  registrationCardImage?: string;
  permitImage?: string;
  insuranceImage?: string;
  platePhoto?: string;
  unitPhoto?: string;
  fullVehiclePhoto?: string;
}

export interface Vehicle {
  vehicleId: string;
  unitId: string;
  ownerId: string;
  unitNumber: string;
  plateNumber: string;
  registrationName?: string;
  associationName: string;
  vehicleType: VehicleType;
  status: VehicleVerificationStatus;
  documents: VehicleDocuments;
  driverId?: string;
  /** Capacidad de carga (pickup / camión) */
  maxLoadKg?: number;
  bedLengthM?: number;
  hasCargoCover?: boolean;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  rejectReason?: string;
  autoRejected?: boolean;
  createdAt: string;
}

export interface DriverProfileRecord {
  id: string;
  userId: string;
  ownerId: string;
  vehicleId: string;
  name: string;
  phone: string;
  status: DriverVerificationStatus;
  inviteCodeUsed?: string;
  rating: number;
  totalTrips: number;
  createdAt: string;
}

export interface DriverSession {
  sessionId: string;
  driverId: string;
  vehicleId: string;
  connectedAt: string;
  disconnectedAt: string | null;
  durationMinutes: number | null;
  totalTrips: number;
  totalKm: number;
  totalCashCollected: number;
}

export interface InviteCode {
  code: string;
  vehicleId: string;
  ownerId: string;
  createdAt: string;
  usedBy?: string;
  usedAt?: string;
}

export interface DailySessionSummary {
  driverId: string;
  driverName: string;
  date: string;
  sessions: DriverSession[];
  connectionCount: number;
  disconnectionCount: number;
  totalHours: number;
  totalTrips: number;
  totalKm: number;
  totalCashCollected: number;
  isCurrentlyOnline: boolean;
}

export interface TripHistoryRecord {
  id: string;
  tripId: string;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  originName: string;
  destinationName: string;
  distanceKm: number;
  price: number;
  durationMinutes: number;
  status: string;
  completedAt: string;
  cancelledAt?: string;
  cancelledBy?: 'passenger' | 'driver';
}

export type HotspotServiceCategory = 'viaje' | 'entrega' | 'carga';

export interface DemandZone {
  id: string;
  latitude: number;
  longitude: number;
  intensity: 'high' | 'medium' | 'low';
  label: string;
  serviceCategory?: HotspotServiceCategory;
  vehicleType?: VehicleType;
}

export interface ParsedCoordinates {
  latitude: number;
  longitude: number;
  source: 'raw' | 'url' | 'whatsapp';
  label?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PlateCheckResult {
  available: boolean;
  message?: string;
  existingOwnerId?: string;
}

export interface OperationGuard {
  allowed: boolean;
  reason?: string;
}

export function canOperate(
  owner?: Owner,
  vehicle?: Vehicle,
  driver?: DriverProfileRecord,
  subscriptionBlocked?: boolean,
  subscriptionReason?: string
): OperationGuard {
  if (subscriptionBlocked) {
    return { allowed: false, reason: subscriptionReason ?? 'Suscripción no activa.' };
  }
  if (!owner || owner.status !== 'approved') {
    return { allowed: false, reason: 'Dueño no aprobado.' };
  }
  if (!vehicle || vehicle.status !== 'approved') {
    return { allowed: false, reason: 'Unidad no aprobada.' };
  }
  if (!driver || driver.status !== 'approved') {
    return { allowed: false, reason: 'Conductor pendiente de aprobación administrativa.' };
  }
  if (!driver.inviteCodeUsed) {
    return { allowed: false, reason: 'Conductor no invitado por el dueño.' };
  }
  return { allowed: true };
}

export function placeFromCoordinates(
  coords: Coordinates,
  label = 'Ubicación compartida'
): { id: string; name: string; coordinates: Coordinates } {
  return {
    id: `coord-${coords.latitude}-${coords.longitude}`,
    name: `${label} (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`,
    coordinates: coords,
  };
}
