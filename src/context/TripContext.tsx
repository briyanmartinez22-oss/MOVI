import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createTripRequest,
  generateMockOffers,
  salvadorPlaces,
  driverRecordToProfile,
} from '../data/mock';
import {
  CargoDetails,
  Coordinates,
  DeliveryCategory,
  Offer,
  Place,
  ServiceRequestType,
  ServiceType,
  TripKind,
  TripLifecycleStatus,
  TripRequest,
  TripType,
} from '../types';
import { DriverSession } from '../types/models';
import { calculateDistanceKm, calculateEtaMinutes } from '../utils/geo';
import { fetchTripRoute, type TripRouteInfo } from '../services/geocodingService';
import { clampPrice } from '../utils/pricing';
import {
  DEFAULT_SERVICE_CATEGORY_ID,
  getPrimaryVehicleType,
  getServiceCategory,
  resolveTripTypeForCategory,
  type ServiceCategoryId,
} from '../data/serviceCategories';
import type { RequestMode } from '../utils/tripScheduling';
import * as mockApi from '../services/mockApi';
import { useMockApi } from '../services/api/config';
import { requestTripOnBackend, cancelTripOnBackend, submitTripOffer, acceptTripOffer, advanceTripOnBackend, fetchAvailableTrips } from '../services/api';
import { realtimeClient } from '../services/realtimeClient';
import {
  getActiveSession,
  getDriverById,
  getDriverByUserId,
  getVehicle,
} from '../services/profileData';
import { currentDriverProfile } from '../data/mock';
import { NotificationTemplates } from '../services/notificationService';
import { clearMeetingShare } from '../services/meetingService';
import { useAuth } from './AuthContext';

interface TripContextValue {
  origin: Place;
  destination: Place | null;
  tripType: TripType;
  tripKind: TripKind;
  setTripKind: (kind: TripKind) => void;
  passengerCount: number;
  setPassengerCount: (count: number) => void;
  tripDescription: string;
  setTripDescription: (description: string) => void;
  tripPhotoUris: string[];
  addTripPhoto: (uri: string) => void;
  removeTripPhoto: (uri: string) => void;
  serviceType: ServiceType;
  setServiceType: (type: ServiceType) => void;
  requestType: ServiceRequestType;
  setRequestType: (type: ServiceRequestType) => void;
  serviceCategoryId: ServiceCategoryId;
  setServiceCategoryId: (id: ServiceCategoryId) => void;
  requestMode: RequestMode;
  setRequestMode: (mode: RequestMode) => void;
  scheduledAt: Date | null;
  setScheduledAt: (date: Date | null) => void;
  scheduledNotes: string;
  setScheduledNotes: (notes: string) => void;
  cargoDetails: CargoDetails | undefined;
  setCargoDetails: (details: CargoDetails | undefined) => void;
  activeTrip: TripRequest | null;
  isDriverOnline: boolean;
  activeSession: DriverSession | null;
  availableTripsCount: number;
  driverRequestStatus: 'offline' | 'waiting' | 'new_request' | 'expired' | 'unavailable';
  driverTrackingCoords: Coordinates | null;
  setOrigin: (place: Place) => void;
  setDestination: (place: Place) => void;
  setTripType: (type: TripType) => void;
  requestTrip: (
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
      serviceCategoryId?: ServiceCategoryId;
      cargoDetails?: CargoDetails;
      requestMode?: RequestMode;
      scheduledAt?: number;
      requiredVehicleType?: string;
    }
  ) => TripRequest;
  simulateIncomingOffers: () => void;
  submitDriverOffer: (price: number, driverUserId?: string) => Offer | null;
  updatePassengerOfferPrice: (price: number) => void;
  acceptOffer: (offerId: string) => void;
  advanceTripLifecycle: (status: TripLifecycleStatus) => void;
  cancelTrip: (by?: 'passenger' | 'driver') => void;
  completeTrip: () => void;
  connectDriver: (driverId: string, vehicleId: string) => Promise<{ ok: boolean; message?: string }>;
  disconnectDriver: (driverId: string) => Promise<{ ok: boolean; message?: string }>;
  refreshDriverSession: (driverId: string) => void;
  getDriverEtaToPickup: (driverUserId?: string) => number;
  getTripDistanceKm: () => number;
  getTripEtaMinutes: () => number;
  tripRoute: TripRouteInfo | null;
}

const TripContext = createContext<TripContextValue | null>(null);

function lifecycleToStatus(lifecycle: TripLifecycleStatus): TripRequest['status'] {
  switch (lifecycle) {
    case 'requested':
      return 'searching';
    case 'offered':
      return 'offers';
    case 'accepted':
      return 'assigned';
    case 'driver_arriving':
    case 'driver_arrived':
      return 'assigned';
    case 'trip_started':
      return 'in_progress';
    case 'trip_completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'idle';
  }
}

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [origin, setOrigin] = useState<Place>(salvadorPlaces[0]);
  const [destination, setDestination] = useState<Place | null>(null);
  const [tripType, setTripType] = useState<TripType>('shared');
  const [tripKind, setTripKind] = useState<TripKind>('ride');
  const [passengerCount, setPassengerCount] = useState(1);
  const [tripDescription, setTripDescription] = useState('');
  const [tripPhotoUris, setTripPhotoUris] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<ServiceType>('movi_ride');
  const [requestType, setRequestType] = useState<ServiceRequestType>('viaje');
  const [serviceCategoryId, setServiceCategoryIdState] =
    useState<ServiceCategoryId>(DEFAULT_SERVICE_CATEGORY_ID);
  const [requestMode, setRequestMode] = useState<RequestMode>('NOW');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [scheduledNotes, setScheduledNotes] = useState('');
  const [cargoDetails, setCargoDetails] = useState<CargoDetails | undefined>();
  const [activeTrip, setActiveTrip] = useState<TripRequest | null>(null);
  const [activeSession, setActiveSession] = useState<DriverSession | null>(null);
  const [availableTripsCount, setAvailableTripsCount] = useState(0);
  const [driverRequestExpired, setDriverRequestExpired] = useState(false);
  const [driverTrackingCoords, setDriverTrackingCoords] = useState<Coordinates | null>(null);
  const [tripRoute, setTripRoute] = useState<TripRouteInfo | null>(null);
  const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshDriverSession = useCallback((driverId: string) => {
    setActiveSession(getActiveSession(driverId) ?? null);
  }, []);

  const setServiceCategoryId = useCallback((id: ServiceCategoryId) => {
    const category = getServiceCategory(id);
    setServiceCategoryIdState(id);
    setServiceType(category.serviceType);
    setRequestType(category.requestType);
    setTripType((current) => resolveTripTypeForCategory(id, current));
    const vehicleType = getPrimaryVehicleType(id);
    if (requestMode === 'SCHEDULED' && !['microbus', 'pickup', 'camion'].includes(vehicleType)) {
      setRequestMode('NOW');
      setScheduledAt(null);
    }
  }, [requestMode]);

  const requestTrip = useCallback(
    (
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
        serviceCategoryId?: ServiceCategoryId;
        cargoDetails?: CargoDetails;
        requestMode?: RequestMode;
        scheduledAt?: number;
        requiredVehicleType?: string;
      }
    ) => {
      if (!destination) throw new Error('Destination is required');
      const effectiveTripType = resolveTripTypeForCategory(serviceCategoryId, tripType);
      const requiredVehicleType = getPrimaryVehicleType(
        options?.serviceCategoryId ?? serviceCategoryId
      );
      const effectiveRequestMode = options?.requestMode ?? requestMode;
      const trip = createTripRequest(
        origin,
        destination,
        effectiveTripType,
        passengerId ?? user?.userId,
        passengerName ?? user?.fullName ?? 'Pasajero',
        {
          ...options,
          kind: options?.kind ?? tripKind,
          passengerCount: options?.passengerCount ?? passengerCount,
          description: options?.description ?? tripDescription,
          photoUris: options?.photoUris ?? tripPhotoUris,
          serviceType: options?.serviceType ?? serviceType,
          requestType: options?.requestType ?? requestType,
          serviceCategoryId: options?.serviceCategoryId ?? serviceCategoryId,
          cargoDetails: options?.cargoDetails ?? cargoDetails,
          requestMode: effectiveRequestMode,
          scheduledAt: options?.scheduledAt ?? scheduledAt?.getTime(),
          requiredVehicleType: options?.requiredVehicleType ?? requiredVehicleType,
        }
      );
      setActiveTrip(trip);

      if (!useMockApi()) {
        void requestTripOnBackend(trip).then((res) => {
          if (res.ok && res.data) {
            setActiveTrip(res.data);
            realtimeClient.subscribeTrip(res.data.id);
          }
        });
      }

      NotificationTemplates.newRequest(user?.userId);
      return trip;
    },
    [
      destination,
      origin,
      tripType,
      tripKind,
      passengerCount,
      tripDescription,
      tripPhotoUris,
      serviceType,
      requestType,
      serviceCategoryId,
      cargoDetails,
      requestMode,
      scheduledAt,
      scheduledNotes,
      user,
    ]
  );

  const addTripPhoto = useCallback((uri: string) => {
    setTripPhotoUris((prev) => (prev.includes(uri) ? prev : [...prev, uri]));
  }, []);

  const removeTripPhoto = useCallback((uri: string) => {
    setTripPhotoUris((prev) => prev.filter((item) => item !== uri));
  }, []);

  const simulateIncomingOffers = useCallback(() => {
    if (!useMockApi()) return;
    setActiveTrip((current) => {
      if (!current || current.offers.length > 0) return current;
      const offers = generateMockOffers(current);
      NotificationTemplates.newOffer(user?.userId);
      return {
        ...current,
        status: 'offers',
        lifecycleStatus: 'offered',
        offers,
      };
    });
  }, [user]);

  const submitDriverOffer = useCallback(
    (price: number, driverUserId?: string): Offer | null => {
      if (!activeTrip) return null;

      if (!useMockApi()) {
        void submitTripOffer(activeTrip.id, price).then((res) => {
          if (res.ok && res.data?.trip) {
            setActiveTrip(res.data.trip);
          }
        });
        return null;
      }

      let driverProfile = currentDriverProfile;
      if (driverUserId) {
        const record = getDriverByUserId(driverUserId);
        const vehicle = record ? getVehicle(record.vehicleId) : undefined;
        if (record && vehicle) {
          driverProfile = driverRecordToProfile(record, vehicle, user?.profilePhoto);
        }
      }

      const distanceToPickup = calculateDistanceKm(
        driverProfile.coordinates,
        activeTrip.origin.coordinates
      );
      const etaMinutes = calculateEtaMinutes(distanceToPickup);

      const offer: Offer = {
        id: `offer-driver-${Date.now()}`,
        driverId: driverProfile.id,
        driver: driverProfile,
        price,
        etaMinutes,
        status: 'pending',
        createdAt: Date.now(),
      };

      setActiveTrip((current) => {
        if (!current) return current;
        const withoutDuplicate = current.offers.filter(
          (item) => item.driverId !== driverProfile.id
        );
        return {
          ...current,
          status: 'offers',
          lifecycleStatus: 'offered',
          offers: [...withoutDuplicate, offer],
        };
      });

      NotificationTemplates.newOffer(activeTrip.passengerId);
      return offer;
    },
    [activeTrip]
  );

  const updatePassengerOfferPrice = useCallback((price: number) => {
    setActiveTrip((current) => {
      if (!current) return current;
      const nextPrice = clampPrice(price, current.tripType, current.serviceCategoryId);
      return { ...current, passengerOfferPrice: nextPrice };
    });
  }, []);

  const acceptOffer = useCallback(
    (offerId: string) => {
      setActiveTrip((current) => {
        if (!current) return current;
        if (!useMockApi()) {
          void acceptTripOffer(current.id, offerId).then((res) => {
            if (res.ok && res.data) {
              setActiveTrip(res.data);
            }
          });
          return current;
        }

        const accepted = current.offers.find((o) => o.id === offerId);
        if (!accepted) return current;

        const driverRecord = getDriverById(accepted.driverId);
        if (driverRecord?.userId) {
          NotificationTemplates.offerAcceptedForDriver(
            driverRecord.userId,
            current.passengerName
          );
        }
        if (current.passengerId) {
          NotificationTemplates.offerAcceptedForPassenger(
            current.passengerId,
            accepted.driver.name
          );
        }

        return {
          ...current,
          status: 'assigned',
          lifecycleStatus: 'accepted',
          acceptedOffer: accepted,
          offers: current.offers.map((o) => ({
            ...o,
            status: o.id === offerId ? 'accepted' : 'rejected',
          })),
        };
      });
    },
    []
  );

  const advanceTripLifecycle = useCallback((status: TripLifecycleStatus) => {
    setActiveTrip((current) => {
      if (!current) return current;
      if (!useMockApi()) {
        void advanceTripOnBackend(current.id, status);
      }

      const next = {
        ...current,
        lifecycleStatus: status,
        status: lifecycleToStatus(status),
        startedAt: status === 'trip_started' ? Date.now() : current.startedAt,
        completedAt: status === 'trip_completed' ? Date.now() : current.completedAt,
      };
      if (status === 'driver_arrived') {
        NotificationTemplates.driverArrived(current.passengerId);
      }
      if (status === 'trip_started') {
        NotificationTemplates.tripStarted(current.passengerId);
      }
      if (status === 'trip_completed') NotificationTemplates.tripCompleted();
      return next;
    });
  }, []);

  const cancelTrip = useCallback((by?: 'passenger' | 'driver') => {
    setActiveTrip((current) => {
      if (!current) return current;
      if (current.id) {
        clearMeetingShare(current.id);
        if (!useMockApi()) {
          void cancelTripOnBackend(current.id, by ?? 'passenger');
        }
      }
      NotificationTemplates.tripCancelled(user?.userId);
      return {
        ...current,
        status: 'cancelled',
        lifecycleStatus: 'cancelled',
        acceptedOffer: null,
      };
    });
    if (trackingRef.current) clearInterval(trackingRef.current);
    setDriverTrackingCoords(null);
    setTimeout(() => setActiveTrip(null), 0);
    void by;
  }, [user]);

  const completeTrip = useCallback(() => {
    setActiveTrip((current) => {
      if (!current?.acceptedOffer) return current;

      const durationMinutes = current.startedAt
        ? Math.round((Date.now() - current.startedAt) / 60000)
        : Math.max(1, Math.round(current.distanceKm * 3));

      mockApi.saveCompletedTrip({
        tripId: current.id,
        passengerId: current.passengerId ?? 'unknown',
        passengerName: current.passengerName,
        driverId: current.acceptedOffer.driverId,
        driverName: current.acceptedOffer.driver.name,
        originName: current.origin.name,
        destinationName: current.destination.name,
        distanceKm: current.distanceKm,
        price: current.acceptedOffer.price,
        durationMinutes,
        status: 'trip_completed',
        completedAt: new Date().toISOString(),
      });

      if (!useMockApi()) {
        void advanceTripOnBackend(current.id, 'trip_completed');
      }

      NotificationTemplates.tripCompleted();
      if (current.kind === 'delivery' && current.businessId && current.acceptedOffer) {
        mockApi.saveCompletedDelivery({
          deliveryId: current.id,
          businessId: current.businessId,
          businessName: current.businessName ?? 'Negocio',
          driverId: current.acceptedOffer.driverId,
          driverName: current.acceptedOffer.driver.name,
          category: current.deliveryCategory ?? 'package',
          originName: current.origin.name,
          destinationName: current.destination.name,
          distanceKm: current.distanceKm,
          price: current.acceptedOffer.price,
          durationMinutes,
          status: 'trip_completed',
          completedAt: new Date().toISOString(),
        });
      }
      clearMeetingShare(current.id);
      return {
        ...current,
        status: 'completed',
        lifecycleStatus: 'trip_completed',
        completedAt: Date.now(),
      };
    });
    if (trackingRef.current) clearInterval(trackingRef.current);
    setDriverTrackingCoords(null);
  }, []);

  const connectDriver = useCallback(async (driverId: string, vehicleId: string) => {
    const res = await mockApi.startDriverSession(driverId, vehicleId);
    if (res.ok && res.data) {
      setActiveSession(res.data);
      if (!useMockApi()) {
        void realtimeClient.connect();
        realtimeClient.setDriverOnline(driverId);
      }
      return { ok: true };
    }
    return { ok: false, message: res.error };
  }, []);

  const disconnectDriver = useCallback(async (driverId: string) => {
    const session = getActiveSession(driverId);
    const trip = activeTrip?.acceptedOffer?.driverId === driverId ? activeTrip : null;
    const res = await mockApi.endDriverSession(driverId, {
      totalTrips: (session?.totalTrips ?? 0) + (trip ? 1 : 0),
      totalKm: (session?.totalKm ?? 0) + (trip?.distanceKm ?? 0),
      totalCashCollected:
        (session?.totalCashCollected ?? 0) + (trip?.acceptedOffer?.price ?? 0),
    });
    if (res.ok) {
      if (!useMockApi()) {
        realtimeClient.setDriverOffline();
      }
      setActiveSession(null);
      setActiveTrip((current) => {
        if (!current?.acceptedOffer || current.acceptedOffer.driverId !== driverId) {
          return null;
        }
        return current;
      });
      return { ok: true };
    }
    return { ok: false, message: res.error };
  }, [activeTrip]);

  const getDriverEtaToPickup = useCallback(
    (driverUserId?: string) => {
      if (!activeTrip) return 0;
      let coords = driverTrackingCoords ?? currentDriverProfile.coordinates;
      if (driverUserId) {
        const record = getDriverByUserId(driverUserId);
        const vehicle = record ? getVehicle(record.vehicleId) : undefined;
        if (record && vehicle) {
          coords = driverRecordToProfile(record, vehicle).coordinates;
        }
      }
      return calculateEtaMinutes(
        calculateDistanceKm(coords, activeTrip.origin.coordinates)
      );
    },
    [activeTrip, driverTrackingCoords]
  );

  const getTripDistanceKm = useCallback(() => {
    if (tripRoute?.distanceKm) return tripRoute.distanceKm;
    if (!destination) return 0;
    return calculateDistanceKm(origin.coordinates, destination.coordinates);
  }, [destination, origin, tripRoute]);

  const getTripEtaMinutes = useCallback(() => {
    if (tripRoute?.durationMinutes) return tripRoute.durationMinutes;
    return calculateEtaMinutes(getTripDistanceKm());
  }, [getTripDistanceKm, tripRoute]);

  useEffect(() => {
    if (!destination) {
      setTripRoute(null);
      return;
    }

    let cancelled = false;
    void fetchTripRoute(origin.coordinates, destination.coordinates).then((route) => {
      if (cancelled) return;
      if (route) {
        setTripRoute(route);
        return;
      }
      setTripRoute({
        distanceKm: calculateDistanceKm(origin.coordinates, destination.coordinates),
        durationMinutes: calculateEtaMinutes(
          calculateDistanceKm(origin.coordinates, destination.coordinates)
        ),
        provider: 'fallback',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [destination, origin]);

  const applyIncomingTripRequest = useCallback((trip: TripRequest) => {
    if (!trip?.id) return;
    setDriverRequestExpired(false);
    setActiveTrip((current) => {
      if (current?.acceptedOffer) return current;
      if (current?.lifecycleStatus && !['requested', 'offered'].includes(current.lifecycleStatus)) {
        return current;
      }
      return trip;
    });
    realtimeClient.subscribeTrip(trip.id);
    NotificationTemplates.newRequest(user?.userId);
  }, [user?.userId]);

  // Driver: receive new trip requests via WS + REST fallback
  useEffect(() => {
    if (useMockApi() || user?.role !== 'driver' || !activeSession) {
      setAvailableTripsCount(0);
      return;
    }

    void realtimeClient.connect();
    realtimeClient.setDriverOnline(activeSession.driverId);

    const offRequestNew = realtimeClient.on('request_new', (payload) => {
      applyIncomingTripRequest(payload as TripRequest);
    });

    const offTripUpdated = realtimeClient.on('trip_updated', (payload) => {
      const updated = payload as TripRequest;
      if (!updated?.id) return;
      setActiveTrip((current) => {
        if (!current || current.id !== updated.id) return current;
        if (
          current.status === 'searching' &&
          updated.status !== 'searching' &&
          !updated.acceptedOffer
        ) {
          setDriverRequestExpired(true);
          return null;
        }
        if (updated.lifecycleStatus === 'cancelled') {
          setDriverRequestExpired(true);
          return null;
        }
        return updated;
      });
    });

    const pollAvailable = () => {
      void fetchAvailableTrips().then((res) => {
        const trips = res.ok ? res.data ?? [] : [];
        setAvailableTripsCount(trips.length);
        const searching = trips.find((t) => t.status === 'searching');
        if (searching) {
          applyIncomingTripRequest(searching);
        }
      });
    };

    pollAvailable();
    const pollTimer = setInterval(pollAvailable, 10000);

    return () => {
      offRequestNew();
      offTripUpdated();
      clearInterval(pollTimer);
    };
  }, [user?.role, activeSession?.driverId, activeSession?.sessionId, applyIncomingTripRequest]);

  const driverRequestStatus = useMemo((): TripContextValue['driverRequestStatus'] => {
    if (!activeSession) return 'offline';
    if (driverRequestExpired) return 'expired';
    if (activeTrip?.status === 'searching') return 'new_request';
    if (availableTripsCount > 0) return 'new_request';
    return 'waiting';
  }, [activeSession, activeTrip?.status, availableTripsCount, driverRequestExpired]);

  // Realtime trip updates when using backend API
  useEffect(() => {
    if (useMockApi() || !activeTrip?.id) return;

    realtimeClient.subscribeTrip(activeTrip.id);

    const offTripUpdated = realtimeClient.on('trip_updated', (payload) => {
      const updated = payload as TripRequest;
      if (updated?.id !== activeTrip.id) return;
      setActiveTrip(updated);
    });

    const offOfferCreated = realtimeClient.on('offer_created', (payload) => {
      const updated = payload as TripRequest;
      if (updated?.id !== activeTrip.id) return;
      NotificationTemplates.newOffer(user?.userId);
      setActiveTrip(updated);
    });

    const offOfferAccepted = realtimeClient.on('offer_accepted', (payload) => {
      const updated = payload as TripRequest;
      if (updated?.id === activeTrip.id) {
        setActiveTrip(updated);
      }
    });

    return () => {
      offTripUpdated();
      offOfferCreated();
      offOfferAccepted();
      realtimeClient.unsubscribeTrip(activeTrip.id);
    };
  }, [activeTrip?.id, user?.userId]);

  // Driver location tracking (mock simulation or WS in real API mode)
  useEffect(() => {
    const isActiveLeg =
      !!activeTrip?.acceptedOffer &&
      ['accepted', 'driver_arriving', 'driver_arrived', 'trip_started'].includes(
        activeTrip.lifecycleStatus
      );

    if (!isActiveLeg) {
      if (trackingRef.current) clearInterval(trackingRef.current);
      return;
    }

    if (useMockApi()) {
      const target =
        activeTrip.lifecycleStatus === 'trip_started'
          ? activeTrip.destination.coordinates
          : activeTrip.origin.coordinates;

      setDriverTrackingCoords(activeTrip.acceptedOffer!.driver.coordinates);

      trackingRef.current = setInterval(() => {
        setDriverTrackingCoords((prev) => {
          const base = prev ?? activeTrip.acceptedOffer!.driver.coordinates;
          const step = 0.0003;
          const latDiff = target.latitude - base.latitude;
          const lngDiff = target.longitude - base.longitude;
          if (Math.abs(latDiff) < step && Math.abs(lngDiff) < step) return target;
          return {
            latitude: base.latitude + Math.sign(latDiff) * step,
            longitude: base.longitude + Math.sign(lngDiff) * step,
          };
        });
      }, 2000);

      return () => {
        if (trackingRef.current) clearInterval(trackingRef.current);
      };
    }

    const tripId = activeTrip.id;
    const sendLocation = () => {
      if (driverTrackingCoords) {
        realtimeClient.sendDriverLocation(
          tripId,
          driverTrackingCoords.latitude,
          driverTrackingCoords.longitude
        );
      }
    };
    sendLocation();
    trackingRef.current = setInterval(sendLocation, 5000);
    return () => {
      if (trackingRef.current) clearInterval(trackingRef.current);
    };
  }, [
    activeTrip?.id,
    activeTrip?.lifecycleStatus,
    activeTrip?.acceptedOffer,
    activeTrip?.origin.coordinates,
    activeTrip?.destination.coordinates,
    driverTrackingCoords,
  ]);

  const value = useMemo(
    () => ({
      origin,
      destination,
      tripType,
      tripKind,
      setTripKind,
      passengerCount,
      setPassengerCount,
      tripDescription,
      setTripDescription,
      tripPhotoUris,
      addTripPhoto,
      removeTripPhoto,
      serviceType,
      setServiceType,
      requestType,
      setRequestType,
      serviceCategoryId,
      setServiceCategoryId,
      requestMode,
      setRequestMode,
      scheduledAt,
      setScheduledAt,
      scheduledNotes,
      setScheduledNotes,
      cargoDetails,
      setCargoDetails,
      activeTrip,
      isDriverOnline: !!activeSession,
      activeSession,
      availableTripsCount,
      driverRequestStatus,
      driverTrackingCoords,
      setOrigin,
      setDestination,
      setTripType,
      requestTrip,
      simulateIncomingOffers,
      submitDriverOffer,
      updatePassengerOfferPrice,
      acceptOffer,
      advanceTripLifecycle,
      cancelTrip,
      completeTrip,
      connectDriver,
      disconnectDriver,
      refreshDriverSession,
      getDriverEtaToPickup,
      getTripDistanceKm,
      getTripEtaMinutes,
      tripRoute,
    }),
    [
      origin,
      destination,
      tripType,
      tripKind,
      passengerCount,
      tripDescription,
      tripPhotoUris,
      serviceType,
      requestType,
      serviceCategoryId,
      setServiceCategoryId,
      requestMode,
      scheduledAt,
      scheduledNotes,
      cargoDetails,
      addTripPhoto,
      removeTripPhoto,
      activeTrip,
      activeSession,
      availableTripsCount,
      driverRequestStatus,
      driverTrackingCoords,
      requestTrip,
      simulateIncomingOffers,
      submitDriverOffer,
      updatePassengerOfferPrice,
      acceptOffer,
      advanceTripLifecycle,
      cancelTrip,
      completeTrip,
      connectDriver,
      disconnectDriver,
      refreshDriverSession,
      getDriverEtaToPickup,
      getTripDistanceKm,
      getTripEtaMinutes,
      tripRoute,
    ]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within TripProvider');
  return ctx;
}
