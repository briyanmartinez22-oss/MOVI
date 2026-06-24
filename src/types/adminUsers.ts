import type { AdminStaffRole } from '../types/adminStaff';

export type AdminDriverRecord = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  status: string;
  mvpStatus: string;
  rating: number;
  totalTrips: number;
  online: boolean;
  subscriptionStatus: string | null;
  licenseFront?: string;
  licenseBack?: string;
  vehicle: {
    unitNumber: string;
    plateNumber: string;
    vehicleType: string;
  } | null;
  ownerName: string;
  phoneVerified: boolean;
  createdAt: string;
};

export type AdminPassengerRecord = {
  id: string;
  fullName: string;
  phoneNumber: string;
  duiNumber: string | null;
  phoneVerified: boolean;
  accountStatus?: string;
  mvpStatus?: string;
  totalTrips: number;
  completedTrips: number;
  createdAt: string;
};

export type AdminVehicleRecord = {
  id: string;
  vehicleId: string;
  unitId: string;
  ownerId: string;
  unitNumber: string;
  plateNumber: string;
  registrationName?: string;
  associationName: string;
  vehicleType: string;
  status: string;
  mvpStatus: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  rejectReason?: string;
  autoRejected?: boolean;
  documents: Record<string, string>;
  photos?: string[];
  owner: { id: string; name: string; phone: string; dui: string } | null;
  driver: { id: string; name: string; phone: string; status: string } | null;
  createdAt: string;
};

export type AdminPassengerDetail = AdminPassengerRecord & {
  recentTrips?: Array<{
    id: string;
    status: string;
    createdAt: string;
    passengerOfferPrice: number | null;
    distanceKm: number;
  }>;
};

export type AdminRatingRecord = {
  id: string;
  tripId: string;
  raterId: string;
  raterName: string;
  raterRole: string;
  rateeId: string;
  rateeName: string;
  rateeRole: string;
  stars: number;
  comment?: string;
  createdAt: string;
};

export type AdminRatingsSummary = {
  average: number;
  count: number;
  lowRatings: number;
};
