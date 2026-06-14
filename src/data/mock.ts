import {
  CargoDetails,
  Coordinates,
  DeliveryCategory,
  Driver,
  Offer,
  Place,
  ServiceRequestType,
  ServiceType,
  TripKind,
  TripRequest,
  TripType,
} from '../types';
import { DriverProfileRecord, Vehicle } from '../types/models';
import { calculateDistanceKm, calculateEtaMinutes } from '../utils/geo';
import { getMinPrice } from '../utils/pricing';

export const EL_SALVADOR_CENTER: Coordinates = {
  latitude: 13.6929,
  longitude: -89.2182,
};

export const ASSOCIATIONS = [
  'Asociación Centro',
  'Asociación Metrocentro',
  'Asociación Soyapango',
  'Asociación Santa Tecla',
] as const;

export const salvadorPlaces: Place[] = [
  {
    id: 'current',
    name: 'Tu ubicación actual',
    coordinates: { latitude: 13.6929, longitude: -89.2182 },
  },
  {
    id: 'metrocentro',
    name: 'Metrocentro San Salvador',
    coordinates: { latitude: 13.7014, longitude: -89.2244 },
  },
  {
    id: 'centro',
    name: 'Centro Histórico San Salvador',
    coordinates: { latitude: 13.6989, longitude: -89.1914 },
  },
  {
    id: 'soyapango',
    name: 'Plaza Mundo Soyapango',
    coordinates: { latitude: 13.7103, longitude: -89.1399 },
  },
  {
    id: 'santa-tecla',
    name: 'Paseo El Carmen, Santa Tecla',
    coordinates: { latitude: 13.6769, longitude: -89.2795 },
  },
  {
    id: 'aeropuerto',
    name: 'Aeropuerto Internacional El Salvador',
    coordinates: { latitude: 13.4409, longitude: -89.0557 },
  },
  {
    id: 'hospital',
    name: 'Hospital Nacional Rosales',
    coordinates: { latitude: 13.6981, longitude: -89.2087 },
  },
  {
    id: 'universidad',
    name: 'Universidad de El Salvador',
    coordinates: { latitude: 13.7264, longitude: -89.2031 },
  },
];

export const mockDrivers: Driver[] = [
  {
    id: 'd1',
    name: 'Carlos Ramírez',
    unit: 'Unidad #012',
    plate: 'MTX-124',
    association: 'Asociación Centro',
    rating: 4.9,
    coordinates: { latitude: 13.6965, longitude: -89.2155 },
    photoUrl: 'https://i.pravatar.cc/150?u=movi-driver-d1',
  },
  {
    id: 'd2',
    name: 'José Pérez',
    unit: 'Unidad #015',
    plate: 'MTX-205',
    association: 'Asociación Central',
    rating: 4.8,
    coordinates: { latitude: 13.6888, longitude: -89.2210 },
    photoUrl: 'https://i.pravatar.cc/150?u=movi-driver-d2',
  },
  {
    id: 'd3',
    name: 'Miguel Hernández',
    unit: 'Unidad #028',
    plate: 'MTX-318',
    association: 'Asociación Metrocentro',
    rating: 4.7,
    coordinates: { latitude: 13.7042, longitude: -89.2108 },
    photoUrl: 'https://i.pravatar.cc/150?u=movi-driver-d3',
  },
  {
    id: 'd4',
    name: 'Roberto Flores',
    unit: 'Unidad #033',
    plate: 'MTX-442',
    association: 'Asociación Soyapango',
    rating: 4.6,
    coordinates: { latitude: 13.6901, longitude: -89.2055 },
    photoUrl: 'https://i.pravatar.cc/150?u=movi-driver-d4',
  },
];

export const mockPassenger = {
  name: 'María García',
  rating: 4.8,
};

export const currentDriverProfile: Driver = mockDrivers[1];

export function driverRecordToProfile(
  record: DriverProfileRecord,
  vehicle: Vehicle,
  photoUrl?: string
): Driver {
  return {
    id: record.id,
    name: record.name,
    unit: `Unidad #${vehicle.unitNumber}`,
    plate: vehicle.plateNumber,
    association: vehicle.associationName,
    rating: record.rating,
    coordinates: { latitude: 13.6929, longitude: -89.2182 },
    photoUrl: photoUrl ?? `https://i.pravatar.cc/150?u=movi-driver-${record.id}`,
  };
}

export function createTripRequest(
  origin: Place,
  destination: Place,
  tripType: TripType,
  passengerId?: string,
  passengerName?: string,
  options?: {
    kind?: TripKind;
    deliveryCategory?: DeliveryCategory;
    businessId?: string;
    businessName?: string;
    passengerCount?: number;
    description?: string;
    photoUris?: string[];
    serviceType?: ServiceType;
    requestType?: ServiceRequestType;
    cargoDetails?: CargoDetails;
  }
): TripRequest {
  const distanceKm = calculateDistanceKm(origin.coordinates, destination.coordinates);
  const passengerCount = Math.max(1, options?.passengerCount ?? 1);
  const description = options?.description?.trim() || 'Viaje MOVI';

  return {
    id: `trip-${Date.now()}`,
    kind: options?.kind ?? 'ride',
    deliveryCategory: options?.deliveryCategory,
    businessId: options?.businessId,
    businessName: options?.businessName,
    passengerId,
    passengerName: passengerName ?? 'Pasajero',
    origin,
    destination,
    tripType,
    distanceKm,
    status: 'searching',
    lifecycleStatus: 'requested',
    offers: [],
    acceptedOffer: null,
    passengerCount,
    passengerOfferPrice: getMinPrice(tripType),
    description,
    photoUris: options?.photoUris?.length ? options.photoUris : undefined,
    serviceType: options?.serviceType ?? 'movi_ride',
    requestType: options?.requestType ?? 'viaje',
    cargoDetails: options?.cargoDetails,
    createdAt: Date.now(),
  };
}

export function generateMockOffers(trip: TripRequest): Offer[] {
  const basePrices = [2.0, 2.5, 3.0, 3.5];

  return mockDrivers.slice(0, 4).map((driver, index) => {
    const distanceToPickup = calculateDistanceKm(driver.coordinates, trip.origin.coordinates);
    const etaMinutes = calculateEtaMinutes(distanceToPickup);
    const minPrice = getMinPrice(trip.tripType);
    const price = Math.max(minPrice, basePrices[index] ?? minPrice);

    return {
      id: `offer-${driver.id}-${trip.id}`,
      driverId: driver.id,
      driver,
      price,
      etaMinutes,
      status: 'pending' as const,
      createdAt: Date.now() + index * 500,
    };
  });
}

export function getPlaceById(id: string): Place | undefined {
  return salvadorPlaces.find((place) => place.id === id);
}

// Legacy exports used by existing screens
export const mockDriver = {
  name: currentDriverProfile.name,
  photo: null as string | null,
  unit: currentDriverProfile.unit,
  plate: currentDriverProfile.plate,
  association: currentDriverProfile.association,
  rating: currentDriverProfile.rating,
  trips: 1240,
  vehicle: 'Tuk-tuk rojo',
};

export const recentDestinations = salvadorPlaces
  .filter((p) => p.id !== 'current')
  .map((p) => p.name);

export const mockTrip = {
  origin: 'Tu ubicación actual',
  destination: 'Metrocentro San Salvador',
  distance: '2.1 km',
  duration: '6 min',
  price: '$2.50',
  eta: '3 min',
};

export const mockRideRequest = {
  passenger: mockPassenger,
  pickup: 'Centro Histórico San Salvador',
  destination: 'Metrocentro San Salvador',
  distance: '2.1 km',
  duration: '6 min al punto',
  fare: '$2.50',
};
