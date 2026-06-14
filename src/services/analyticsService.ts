import type { ExecutiveKpis, PlatformMetrics, VehicleType } from '../types/models';
import { getVehicleTypeMeta, normalizeVehicleType } from '../utils/vehicleTypes';
import type { MapMarker } from '../types';
import { salvadorPlaces } from '../data/mock';
import { getSimulationMeta, getStore } from './mockStore';

/** Estima km ahorrados: viajes digitales evitan búsqueda aleatoria (~2.5 km/viaje). */
const KM_SAVED_PER_DIGITAL_TRIP = 2.5;
const LITERS_PER_KM = 0.12;
const MINUTES_SAVED_PER_DIGITAL_TRIP = 5;

const CITY_FROM_ASSOCIATION: Record<string, string> = {
  'Asociación Centro': 'San Salvador',
  'Asociación Metrocentro': 'San Salvador',
  'Asociación Soyapango': 'Soyapango',
  'Asociación Santa Tecla': 'Santa Tecla',
  'Asociación Central': 'San Salvador',
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function countSince(dates: string[], since: Date): number {
  return dates.filter((iso) => new Date(iso) >= since).length;
}

function placeCoordsByName(name: string): { latitude: number; longitude: number } | null {
  const place = salvadorPlaces.find(
    (p) => p.id !== 'current' && (name.includes(p.name) || p.name.includes(name.split(',')[0]))
  );
  return place?.coordinates ?? null;
}

function computePeakHours(dates: string[], topN = 4): string[] {
  if (dates.length === 0) return ['7:00', '12:00', '17:00', '19:00'];
  const counts = new Array(24).fill(0) as number[];
  dates.forEach((iso) => {
    counts[new Date(iso).getHours()]++;
  });
  return [...counts.keys()]
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, topN)
    .map((h) => `${h}:00`);
}

function computePeakDays(dates: string[], topN = 3): string[] {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  if (dates.length === 0) return ['Viernes', 'Sábado', 'Domingo'];
  const counts = new Array(7).fill(0) as number[];
  dates.forEach((iso) => {
    counts[new Date(iso).getDay()]++;
  });
  return [...counts.keys()]
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, topN)
    .map((d) => dayNames[d]);
}

function computeTopRoutes(
  trips: { originName: string; destinationName: string }[],
  limit = 3
): string[] {
  const freq = new Map<string, number>();
  trips.forEach((t) => {
    const key = `${t.originName} → ${t.destinationName}`;
    freq.set(key, (freq.get(key) ?? 0) + 1);
  });
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return [
      'Metrocentro → Centro Histórico',
      'Soyapango → San Salvador',
      'Santa Tecla → Metrocentro',
    ];
  }
  return sorted.slice(0, limit).map(([route]) => route);
}

function avgOrDefault(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function computeKmSaved(tripCount: number, deliveryCount: number): number {
  return Math.round((tripCount + deliveryCount) * KM_SAVED_PER_DIGITAL_TRIP);
}

export function getUserMetrics() {
  const store = getStore();
  const meta = getSimulationMeta();
  const activeSessions = store.sessions.filter((s) => !s.disconnectedAt).length;
  const verifiedUsers = store.users.filter((u) => u.phoneVerified).length;

  return {
    totalPassengers: meta?.totalPassengers ?? store.users.filter((u) => u.role === 'passenger').length,
    totalDrivers: meta?.totalDrivers ?? store.drivers.length,
    totalOwners: meta?.totalOwners ?? store.owners.length,
    totalBusinesses: meta?.totalBusinesses ?? store.businesses?.length ?? 0,
    totalVehicles: meta?.totalVehicles ?? store.vehicles.length,
    totalUsers: meta?.totalPlatformUsers ?? store.users.length,
    activeUsers: meta ? meta.driversConnected + Math.floor(meta.totalPassengers * 0.12) : activeSessions + verifiedUsers,
    activeDriversOnline: meta?.driversConnected ?? activeSessions,
  };
}

export function getOperationMetrics() {
  const store = getStore();
  const meta = getSimulationMeta();
  const tripDates = store.tripHistory.map((t) => t.completedAt);
  const deliveryDates = (store.deliveryHistory ?? []).map((d) => d.completedAt);

  return {
    totalTrips: meta?.totalTrips ?? store.tripHistory.length,
    totalDeliveries: meta?.totalDeliveries ?? store.deliveryHistory?.length ?? 0,
    tripsToday: meta?.tripsToday ?? countSince(tripDates, daysAgo(1)),
    tripsWeek: meta?.tripsWeek ?? countSince(tripDates, daysAgo(7)),
    tripsMonth: meta?.tripsMonth ?? countSince(tripDates, daysAgo(30)),
    deliveriesToday: meta?.deliveriesToday ?? countSince(deliveryDates, daysAgo(1)),
    deliveriesWeek: meta?.deliveriesWeek ?? countSince(deliveryDates, daysAgo(7)),
    deliveriesMonth: meta?.deliveriesMonth ?? countSince(deliveryDates, daysAgo(30)),
    activeTrips: store.tripHistory.filter(
      (t) => t.status !== 'trip_completed' && t.status !== 'cancelled'
    ).length,
    pendingRequests: store.tripHistory.filter((t) => t.status === 'requested').length,
  };
}

export function getPlatformMetrics(): PlatformMetrics {
  const store = getStore();
  const users = getUserMetrics();
  const ops = getOperationMetrics();
  const drivers = store.drivers;
  const subs = store.subscriptions ?? [];

  const meta = getSimulationMeta();
  const driversOnTrial = meta?.driversOnTrial ?? subs.filter((s) => s.status === 'trial_until_next_month').length;
  const driversActive = meta?.driversActive ?? subs.filter((s) => s.status === 'active').length;
  const driversSuspended =
    meta?.driversSuspended ??
    subs.filter((s) => s.status === 'suspended' || s.status === 'past_due').length;
  const driversPastDue = meta?.driversPastDue ?? subs.filter((s) => s.status === 'past_due').length;

  const mrr = meta?.mrr ?? driversActive * 7;
  const trips = store.tripHistory;
  const deliveries = store.deliveryHistory ?? [];
  const allDates = [
    ...trips.map((t) => t.completedAt),
    ...deliveries.map((d) => d.completedAt),
  ];

  const completedTrips = trips.filter((t) => t.status === 'trip_completed');
  const avgWait = avgOrDefault(
    completedTrips.map((t) => Math.max(1, t.durationMinutes * 0.25)),
    4
  );
  const avgArrival = avgOrDefault(
    completedTrips.map((t) => Math.max(3, t.durationMinutes * 0.35)),
    8
  );
  const avgPrice = avgOrDefault(
    [...trips, ...deliveries].map((r) => r.price),
    2.75
  );

  return {
    totalPassengers: users.totalPassengers,
    totalDrivers: users.totalDrivers,
    totalOwners: users.totalOwners,
    totalBusinesses: users.totalBusinesses,
    totalVehicles: users.totalVehicles,
    totalTrips: ops.totalTrips,
    totalDeliveries: ops.totalDeliveries,
    kmSavedEstimate: computeKmSaved(ops.totalTrips, ops.totalDeliveries),
    monthlySubscriptionRevenue: mrr,
    mrr,
    arr: meta?.arr ?? mrr * 12,
    driversOnTrial,
    driversActive,
    driversSuspended,
    driversPastDue,
    peakHours: computePeakHours(allDates),
    peakDays: computePeakDays(allDates),
    hotZones: store.demandZones.filter((z) => z.intensity === 'high').map((z) => z.label),
    avgArrivalMinutes: meta?.avgArrivalMinutes ?? avgArrival,
    avgWaitMinutes: meta ? meta.avgResponseSeconds / 60 : avgWait,
    avgOfferedPrice: avgPrice,
    topRoutes: computeTopRoutes(trips),
    activeDriversOnline: users.activeDriversOnline,
    tripsToday: ops.tripsToday,
    tripsWeek: ops.tripsWeek,
    tripsMonth: ops.tripsMonth,
    deliveriesToday: ops.deliveriesToday,
    deliveriesWeek: ops.deliveriesWeek,
    deliveriesMonth: ops.deliveriesMonth,
    activeUsers: users.activeUsers,
  };
}

export function getExecutiveKpis(): ExecutiveKpis {
  const m = getPlatformMetrics();

  return {
    mrr: m.mrr ?? m.monthlySubscriptionRevenue,
    arr: m.arr ?? (m.mrr ?? m.monthlySubscriptionRevenue) * 12,
    tripsToday: m.tripsToday ?? 0,
    tripsWeek: m.tripsWeek ?? 0,
    tripsMonth: m.tripsMonth ?? 0,
    deliveriesToday: m.deliveriesToday ?? 0,
    deliveriesWeek: m.deliveriesWeek ?? 0,
    deliveriesMonth: m.deliveriesMonth ?? 0,
    activeUsers: m.activeUsers ?? m.activeDriversOnline ?? 0,
    driversPastDue: m.driversPastDue ?? 0,
  };
}

export function getLiveOperationsSnapshot() {
  const store = getStore();
  const ops = getOperationMetrics();
  return {
    activeTrips: ops.activeTrips,
    pendingRequests: ops.pendingRequests,
    connectedDrivers: store.sessions.filter((s) => !s.disconnectedAt).length,
    hotspots: store.demandZones.filter((z) => z.intensity === 'high').length,
  };
}

export function getFinancialKpis() {
  const store = getStore();
  const m = getPlatformMetrics();
  const subs = store.subscriptions ?? [];

  const revenueByCityMap = new Map<string, number>();
  store.vehicles.forEach((v) => {
    const driver = store.drivers.find((d) => d.vehicleId === v.vehicleId);
    if (!driver) return;
    const sub = subs.find((s) => s.driverId === driver.id && s.status === 'active');
    if (!sub) return;
    const city = CITY_FROM_ASSOCIATION[v.associationName] ?? 'San Salvador';
    revenueByCityMap.set(city, (revenueByCityMap.get(city) ?? 0) + 7);
  });

  const revenueByCity =
    revenueByCityMap.size > 0
      ? [...revenueByCityMap.entries()].map(([city, amount]) => ({ city, amount }))
      : [{ city: 'San Salvador', amount: m.monthlySubscriptionRevenue }];

  return {
    activeDrivers: m.driversActive,
    trialDrivers: m.driversOnTrial,
    suspendedDrivers: m.driversSuspended,
    pastDueDrivers: m.driversPastDue ?? 0,
    monthlyRevenue: m.monthlySubscriptionRevenue,
    mrr: m.mrr ?? m.monthlySubscriptionRevenue,
    arr: m.arr ?? m.monthlySubscriptionRevenue * 12,
    renewals: m.driversActive,
    churn: m.driversSuspended,
    revenueByCity,
    driverStates: {
      active: m.driversActive,
      trial: m.driversOnTrial,
      suspended: m.driversSuspended,
      pastDue: m.driversPastDue ?? 0,
    },
  };
}

export function getQualityKpis() {
  const store = getStore();
  const meta = getSimulationMeta();
  const drivers = [...store.drivers].sort((a, b) => b.rating - a.rating);
  const cancellations = meta?.cancellations ?? store.tripHistory.filter((t) => t.status === 'cancelled').length;
  const completed = store.tripHistory.filter((t) => t.status === 'trip_completed').length;
  const complaints = meta?.complaints ?? Math.max(0, Math.floor(cancellations * 0.4));
  const reports = meta?.reports ?? Math.max(0, Math.floor(complaints * 0.5));

  return {
    bestDrivers: drivers.slice(0, 3),
    worstDrivers: [...store.drivers].sort((a, b) => a.rating - b.rating).slice(0, 3),
    cancellations,
    complaints,
    reports,
    completionRate:
      completed + cancellations > 0
        ? Math.round((completed / (completed + cancellations)) * 100)
        : 100,
  };
}

export function getIntelligenceKpis() {
  const store = getStore();
  const m = getPlatformMetrics();
  const exclusive = getMoviExclusiveKpis();
  const trips = store.tripHistory;
  const deliveries = store.deliveryHistory ?? [];
  const allDates = [
    ...trips.map((t) => t.completedAt),
    ...deliveries.map((d) => d.completedAt),
  ];

  return {
    peakHours: computePeakHours(allDates),
    peakDays: computePeakDays(allDates),
    hotspotsCount: store.demandZones.filter((z) => z.intensity === 'high').length,
    hotZones: m.hotZones,
    topRoutes: m.topRoutes,
    avgArrivalMinutes: m.avgArrivalMinutes,
    avgWaitMinutes: m.avgWaitMinutes,
    avgOfferedPrice: m.avgOfferedPrice,
    fuelSavedLiters: exclusive.fuelSavedLiters,
    connectedDrivers: store.sessions.filter((s) => !s.disconnectedAt).length,
  };
}

export interface VehicleTypeKpiRow {
  vehicleType: VehicleType;
  label: string;
  trips: number;
  deliveries: number;
  revenue: number;
  activeDrivers: number;
  vehicles: number;
}

export function getVehicleTypeKpis(): VehicleTypeKpiRow[] {
  const store = getStore();
  const rows = new Map<
    VehicleType,
    { trips: number; deliveries: number; revenue: number; activeDrivers: number; vehicles: number }
  >();

  const ensure = (type: VehicleType) => {
    const key = normalizeVehicleType(type);
    if (!rows.has(key)) {
      rows.set(key, { trips: 0, deliveries: 0, revenue: 0, activeDrivers: 0, vehicles: 0 });
    }
    return rows.get(key)!;
  };

  store.vehicles.forEach((vehicle) => {
    ensure(vehicle.vehicleType).vehicles += 1;
  });

  store.tripHistory.forEach((trip) => {
    const driver = store.drivers.find((d) => d.id === trip.driverId);
    const vehicle = driver ? store.vehicles.find((v) => v.vehicleId === driver.vehicleId) : undefined;
    const row = ensure(vehicle?.vehicleType ?? 'mototaxi');
    row.trips += 1;
    row.revenue += trip.price;
  });

  (store.deliveryHistory ?? []).forEach((delivery) => {
    const driver = store.drivers.find((d) => d.id === delivery.driverId);
    const vehicle = driver ? store.vehicles.find((v) => v.vehicleId === driver.vehicleId) : undefined;
    const row = ensure(vehicle?.vehicleType ?? 'mototaxi');
    row.deliveries += 1;
    row.revenue += delivery.price;
  });

  const connectedDriverIds = new Set(
    store.sessions.filter((s) => !s.disconnectedAt).map((s) => s.driverId)
  );
  connectedDriverIds.forEach((driverId) => {
    const driver = store.drivers.find((d) => d.id === driverId);
    const vehicle = driver ? store.vehicles.find((v) => v.vehicleId === driver.vehicleId) : undefined;
    if (vehicle) ensure(vehicle.vehicleType).activeDrivers += 1;
  });

  return [...rows.entries()]
    .map(([vehicleType, stats]) => ({
      vehicleType,
      label: getVehicleTypeMeta(vehicleType).label,
      ...stats,
    }))
    .sort((a, b) => b.trips + b.deliveries - (a.trips + a.deliveries));
}

export function getMoviExclusiveKpis() {
  const store = getStore();
  const meta = getSimulationMeta();
  const trips = store.tripHistory;
  const deliveries = store.deliveryHistory ?? [];
  const tripCount = meta?.totalTrips ?? trips.length;
  const deliveryCount = meta?.totalDeliveries ?? deliveries.length;
  const digitalCount = tripCount + deliveryCount;

  const sampleKm =
    trips.reduce((s, t) => s + t.distanceKm, 0) + deliveries.reduce((s, d) => s + d.distanceKm, 0);
  const kmTraveled = meta
    ? Math.round(tripCount * 4.2 + deliveryCount * 3.1)
    : Math.round(sampleKm * 10) / 10;

  const kmSaved = computeKmSaved(tripCount, deliveryCount);
  const fuelSavedLiters = Math.round(kmSaved * LITERS_PER_KM * 10) / 10;
  const timeSavedMinutes = digitalCount * MINUTES_SAVED_PER_DIGITAL_TRIP;

  return {
    kmTraveled,
    kmSaved,
    fuelSavedLiters,
    timeSavedMinutes,
    digitalTripsCount: digitalCount,
  };
}

export function getOperationsMapMarkers(): MapMarker[] {
  const store = getStore();
  const markers: MapMarker[] = [];
  const zones = store.demandZones;

  store.sessions
    .filter((s) => !s.disconnectedAt)
    .forEach((session, i) => {
      const driver = store.drivers.find((d) => d.id === session.driverId);
      const zone = zones[i % Math.max(zones.length, 1)];
      const coords = zone
        ? { latitude: zone.latitude, longitude: zone.longitude }
        : salvadorPlaces[1].coordinates;

      markers.push({
        id: `driver-${session.sessionId}`,
        latitude: coords.latitude + (i % 3) * 0.002,
        longitude: coords.longitude - (i % 2) * 0.002,
        type: 'driver',
        label: driver?.name?.split(' ')[0] ?? 'Conductor',
      });
    });

  store.tripHistory
    .filter((t) => t.status !== 'trip_completed' && t.status !== 'cancelled')
    .forEach((trip) => {
      const origin = placeCoordsByName(trip.originName);
      const dest = placeCoordsByName(trip.destinationName);
      if (origin) {
        markers.push({
          id: `trip-origin-${trip.id}`,
          latitude: origin.latitude,
          longitude: origin.longitude,
          type: 'origin',
          label: trip.passengerName.split(' ')[0],
        });
      }
      if (dest) {
        markers.push({
          id: `trip-dest-${trip.id}`,
          latitude: dest.latitude,
          longitude: dest.longitude,
          type: 'destination',
        });
      }
    });

  return markers;
}

export function exportReport(format: 'pdf' | 'excel') {
  const k = getExecutiveKpis();
  const m = getPlatformMetrics();
  const exclusive = getMoviExclusiveKpis();
  return {
    format,
    filename: `movi-reporte-${format}-${new Date().toISOString().slice(0, 10)}`,
    rows: [
      ['MRR', k.mrr],
      ['ARR', k.arr],
      ['Viajes hoy', k.tripsToday],
      ['Viajes mes', k.tripsMonth],
      ['Conductores online', m.activeDriversOnline ?? 0],
      ['Km recorridos', exclusive.kmTraveled],
      ['Km ahorrados', exclusive.kmSaved],
      ['Combustible ahorrado (L)', exclusive.fuelSavedLiters],
      ['Tiempo ahorrado (min)', exclusive.timeSavedMinutes],
    ],
  };
}
