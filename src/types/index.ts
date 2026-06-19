import type { CargoDetails } from './tripExtras';
import type { ServiceRequestType, ServiceType } from './models';
import type { ServiceCategoryId } from '../data/serviceCategories';

export type { CargoDetails, ServiceRequestType, ServiceType, ServiceCategoryId };

export type TripType = 'shared' | 'private';

export type TripKind = 'ride' | 'delivery' | 'personal_delivery';

export type DeliveryCategory = 'food' | 'package' | 'documents' | 'shopping';

export type TripLifecycleStatus =
  | 'requested'
  | 'offered'
  | 'accepted'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'trip_started'
  | 'trip_completed'
  | 'cancelled';

export type RequestMode = 'NOW' | 'SCHEDULED';

export type ScheduledStatus = 'open' | 'confirmed';

export type TripStatus =
  | TripLifecycleStatus
  | 'idle'
  | 'searching'
  | 'offers'
  | 'assigned'
  | 'in_progress'
  | 'completed';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  coordinates: Coordinates;
}

export interface Driver {
  id: string;
  name: string;
  unit: string;
  plate: string;
  association: string;
  rating: number;
  coordinates: Coordinates;
  photoUrl?: string;
  vehicleType?: string;
}

export interface Offer {
  id: string;
  driverId: string;
  driver: Driver;
  price: number;
  etaMinutes: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'not_selected';
  createdAt: number;
}

export interface TripRequest {
  id: string;
  kind?: TripKind;
  deliveryCategory?: DeliveryCategory;
  businessId?: string;
  businessName?: string;
  passengerId?: string;
  passengerName: string;
  origin: Place;
  destination: Place;
  tripType: TripType;
  distanceKm: number;
  status: TripStatus;
  lifecycleStatus: TripLifecycleStatus;
  offers: Offer[];
  acceptedOffer: Offer | null;
  passengerCount: number;
  /** Precio máximo que el pasajero está dispuesto a pagar */
  passengerOfferPrice?: number;
  description: string;
  photoUris?: string[];
  serviceType?: ServiceType;
  requestType?: ServiceRequestType;
  serviceCategoryId?: ServiceCategoryId;
  cargoDetails?: CargoDetails;
  requestMode?: RequestMode;
  scheduledAt?: number;
  offerDeadlineAt?: number;
  requiredVehicleType?: string;
  scheduledStatus?: ScheduledStatus;
  pickupLatitude?: number;
  pickupLongitude?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface DriverConnectionState {
  isOnline: boolean;
  hasConnectedToday: boolean;
  hasDisconnectedToday: boolean;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastResetDate: string;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: 'origin' | 'destination' | 'user' | 'driver';
  label?: string;
}
