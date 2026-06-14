import type { MockStoreData } from '../mockStore';
import type {
  AuthUser,
  BusinessProfile,
  BusinessType,
  DeliveryCategory,
  DeliveryHistoryRecord,
  DemandZone,
  DriverProfileRecord,
  DriverSession,
  DriverSubscription,
  InviteCode,
  Owner,
  TripHistoryRecord,
  UserRole,
  Vehicle,
} from '../../types/models';
import type {
  DemoRoleStats,
  DemoSimulationMeta,
  OwnerDashboardStats,
  PassengerProfileExtra,
} from '../../types/demoSimulation';
import {
  DEMO_SEED,
  saveDemoManifest,
  buildDemoManifestFromStore,
} from '../../data/demoCredentials';
import { ASSOCIATIONS, salvadorPlaces } from '../../data/mock';
import {
  generateDriverPublicId,
  generateUnitId,
  normalizeDui,
  normalizePhone,
  normalizeDuiDigits,
} from '../../utils/platform';
import { createDriverSubscription } from '../subscriptionService';
import { seedDemoChatMessages } from '../chatService';
import { mulberry32, pick, pickWeighted } from './rng';

const COUNTS = {
  passengers: 500,
  drivers: 300,
  owners: 80,
  vehicles: 450,
  businesses: 120,
  storedTrips: 1800,
  storedDeliveries: 900,
  subscriptions: 300,
} as const;

const TARGET = {
  totalPlatformUsers: 5000,
  totalTrips: 25000,
  totalDeliveries: 15000,
  tripsToday: 418,
  tripsWeek: 5820,
  tripsMonth: 25000,
  deliveriesToday: 276,
  deliveriesWeek: 3480,
  deliveriesMonth: 15000,
  driversActive: 240,
  driversOnTrial: 35,
  driversPastDue: 25,
  driversSuspended: 12,
  driversConnected: 87,
  mrr: 2100,
  arr: 25200,
  retentionPct: 92,
  churnPct: 4,
  conversionPct: 28,
  avgArrivalMinutes: 4.8,
  avgResponseSeconds: 18,
} as const;

const FIRST_NAMES = [
  'María', 'José', 'Carlos', 'Ana', 'Roberto', 'Carmen', 'Luis', 'Patricia', 'Miguel', 'Elena',
  'Francisco', 'Sofía', 'Rosa', 'Jorge', 'Laura', 'Pedro', 'Gabriela', 'Andrés', 'Diana', 'Ricardo',
  'Claudia', 'Óscar', 'Verónica', 'Mario', 'Silvia', 'Fernando', 'Beatriz', 'Héctor', 'Natalia', 'Julio',
] as const;

const LAST_NAMES = [
  'García', 'Hernández', 'Martínez', 'López', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivas', 'Mendoza',
  'Vásquez', 'Romero', 'Castillo', 'Morales', 'Reyes', 'Cruz', 'Gómez', 'Pineda', 'Medina', 'Aguilar',
] as const;

const CITIES = [
  { name: 'San Salvador', weight: 35, lat: 13.6929, lng: -89.2182 },
  { name: 'Soyapango', weight: 20, lat: 13.7103, lng: -89.1399 },
  { name: 'Apopa', weight: 15, lat: 13.8074, lng: -89.1792 },
  { name: 'Santa Ana', weight: 12, lat: 13.9942, lng: -89.5592 },
  { name: 'Ahuachapán', weight: 9, lat: 13.9213, lng: -89.845 },
  { name: 'Sonsonate', weight: 9, lat: 13.7203, lng: -89.7242 },
] as const;

const BUSINESS_NAMES = [
  'Farmacia Central', 'Ferretería El Constructor', 'Panadería El Sol', 'Tienda Don José',
  'Repuestos Centro', 'Supermercado La Unión', 'Pupusería La Ceiba', 'Café Metro',
  'Mini Súper El Pino', 'Restaurante El Zócalo', 'Farmacia San José', 'Comercial Rivas',
  'Distribuidora Norte', 'Pollería El Buen Sabor', 'Librería Estudiante', 'TecnoCell Soyapango',
  'Boutique Elegance', 'Verdulería Fresca', 'Pizzería Roma', 'Óptica Visión',
] as const;

const BUSINESS_TYPES: BusinessType[] = ['restaurant', 'store', 'pharmacy', 'commerce', 'startup', 'other'];
const DELIVERY_CATEGORIES: DeliveryCategory[] = ['food', 'package', 'documents', 'shopping'];
function monthsAgoIso(rng: () => number, maxMonths = 8): string {
  const d = new Date();
  d.setMonth(d.getMonth() - Math.floor(rng() * maxMonths));
  d.setDate(1 + Math.floor(rng() * 27));
  return d.toISOString();
}

function randomRecentIso(rng: () => number, maxDaysAgo: number): string {
  const ms = Date.now() - Math.floor(rng() * maxDaysAgo * 86400000);
  return new Date(ms).toISOString();
}

function makeDui(rng: () => number, used: Set<string>): string {
  let dui: string;
  do {
    const digits = String(Math.floor(10000000 + rng() * 89999999)).slice(0, 8);
    dui = normalizeDui(`${digits}-${Math.floor(rng() * 10)}`);
  } while (used.has(normalizeDuiDigits(dui)));
  used.add(normalizeDuiDigits(dui));
  return dui;
}

function uniquePhones(rng: () => number, count: number): string[] {
  const phones = new Set<string>();
  while (phones.size < count) {
    const local = String(Math.floor(1_000_000 + rng() * 8_999_999)).padStart(7, '0');
    phones.add(normalizePhone(`7${local}`));
  }
  return [...phones];
}

function createUser(
  userId: string,
  phone: string,
  fullName: string,
  dui: string,
  role: UserRole,
  createdAt: string
): AuthUser {
  return {
    userId,
    fullName,
    phoneNumber: normalizePhone(phone),
    duiNumber: normalizeDui(dui),
    role,
    phoneVerified: true,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildDemandZones(rng: () => number): DemandZone[] {
  const services: DemandZone['serviceCategory'][] = ['viaje', 'entrega', 'carga'];
  const vehicles: DemandZone['vehicleType'][] = [
    'mototaxi',
    'qute',
    'motocicleta',
    'sedan',
    'pickup',
    'camion',
  ];
  const hotspots: { label: string; lat: number; lng: number; intensity: DemandZone['intensity'] }[] = [
    { label: 'Centro Histórico', lat: 13.6989, lng: -89.1914, intensity: 'high' },
    { label: 'Soyapango', lat: 13.7103, lng: -89.1399, intensity: 'high' },
    { label: 'Apopa', lat: 13.8074, lng: -89.1792, intensity: 'high' },
    { label: 'Santa Ana Centro', lat: 13.9942, lng: -89.5592, intensity: 'medium' },
    { label: 'Sonsonate Centro', lat: 13.7203, lng: -89.7242, intensity: 'medium' },
    { label: 'Metrocentro', lat: 13.7014, lng: -89.2244, intensity: 'high' },
    { label: 'San Salvador', lat: 13.6929, lng: -89.2182, intensity: 'medium' },
    { label: 'Santa Tecla', lat: 13.6769, lng: -89.2795, intensity: 'low' },
    { label: 'Ahuachapán Centro', lat: 13.9213, lng: -89.845, intensity: 'low' },
  ];
  return hotspots.map((z, i) => ({
    id: `dz-${i + 1}`,
    latitude: z.lat + (rng() - 0.5) * 0.008,
    longitude: z.lng + (rng() - 0.5) * 0.008,
    intensity: rng() > 0.35 ? z.intensity : pick(rng, ['medium', 'low'] as const),
    label: z.label,
    serviceCategory: services[i % services.length],
    vehicleType: vehicles[i % vehicles.length],
  }));
}

function buildTrips(
  rng: () => number,
  passengers: AuthUser[],
  drivers: DriverProfileRecord[],
  profiles: PassengerProfileExtra[]
): TripHistoryRecord[] {
  const places = salvadorPlaces.filter((p) => p.id !== 'current');
  const records: TripHistoryRecord[] = [];
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  for (let i = 0; i < COUNTS.storedTrips; i++) {
    const passenger = passengers[i % passengers.length];
    const driver = drivers[i % drivers.length];
    const origin = places[Math.floor(rng() * places.length)];
    let dest = places[Math.floor(rng() * places.length)];
    if (dest.id === origin.id) dest = places[(places.indexOf(origin) + 1) % places.length];

    const daysBucket = rng();
    let completedAt: string;
    let status: string;
    if (daysBucket < 0.04) {
      completedAt = new Date().toISOString();
      status = pick(rng, ['driver_arriving', 'requested', 'trip_completed']);
    } else if (daysBucket < 0.2) {
      completedAt = randomRecentIso(rng, 1);
      status = 'trip_completed';
    } else if (daysBucket < 0.45) {
      completedAt = randomRecentIso(rng, 7);
      status = rng() < 0.08 ? 'cancelled' : 'trip_completed';
    } else {
      completedAt = randomRecentIso(rng, 30);
      status = rng() < 0.06 ? 'cancelled' : 'trip_completed';
    }

    const price = Math.round((0.5 + rng() * 7.5) * 100) / 100;
    const distanceKm = Math.round((1 + rng() * 12) * 10) / 10;
    const prof = profileMap.get(passenger.userId);

    records.push({
      id: `hist-sim-${i + 1}`,
      tripId: `trip-sim-${i + 1}`,
      passengerId: passenger.userId,
      passengerName: passenger.fullName,
      driverId: driver.id,
      driverName: driver.name,
      originName: origin.name,
      destinationName: dest.name,
      distanceKm,
      price,
      durationMinutes: 5 + Math.floor(rng() * 35),
      status,
      completedAt,
    });

    if (prof) prof.tripCount += status === 'trip_completed' ? 1 : 0;
  }

  return records.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

function buildDeliveries(
  rng: () => number,
  businesses: BusinessProfile[],
  drivers: DriverProfileRecord[]
): DeliveryHistoryRecord[] {
  const places = salvadorPlaces.filter((p) => p.id !== 'current');
  const approved = businesses.filter((b) => b.status === 'approved');
  const records: DeliveryHistoryRecord[] = [];

  for (let i = 0; i < COUNTS.storedDeliveries; i++) {
    const business = approved[i % approved.length] ?? businesses[0];
    const driver = drivers[i % drivers.length];
    const daysBucket = rng();
    let completedAt: string;
    if (daysBucket < 0.05) completedAt = new Date().toISOString();
    else if (daysBucket < 0.22) completedAt = randomRecentIso(rng, 1);
    else if (daysBucket < 0.48) completedAt = randomRecentIso(rng, 7);
    else completedAt = randomRecentIso(rng, 30);

    records.push({
      id: `dhist-sim-${i + 1}`,
      deliveryId: `del-sim-${i + 1}`,
      businessId: business.id,
      businessName: business.businessName,
      driverId: driver.id,
      driverName: driver.name,
      category: pick(rng, DELIVERY_CATEGORIES),
      originName: business.addressLabel,
      destinationName: places[Math.floor(rng() * places.length)].name,
      distanceKm: Math.round((1 + rng() * 8) * 10) / 10,
      price: Math.round((0.5 + rng() * 7.5) * 100) / 100,
      durationMinutes: 8 + Math.floor(rng() * 28),
      status: rng() < 0.03 ? 'cancelled' : 'delivery_completed',
      completedAt,
    });
  }

  return records.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

function buildSessions(rng: () => number, drivers: DriverProfileRecord[], vehicles: Vehicle[]): DriverSession[] {
  const sessions: DriverSession[] = [];
  const approved = drivers.filter((d) => d.status === 'approved');
  let id = 0;

  approved.slice(0, TARGET.driversConnected).forEach((driver) => {
    sessions.push({
      sessionId: `session-live-${++id}`,
      driverId: driver.id,
      vehicleId: driver.vehicleId,
      connectedAt: new Date(Date.now() - Math.floor(rng() * 4 * 3600000)).toISOString(),
      disconnectedAt: null,
      durationMinutes: null,
      totalTrips: Math.floor(rng() * 6),
      totalKm: Math.round(rng() * 20 * 10) / 10,
      totalCashCollected: Math.round(rng() * 45 * 100) / 100,
    });
  });

  approved.forEach((driver) => {
    const count = 3 + Math.floor(rng() * 8);
    for (let s = 0; s < count; s++) {
      const connected = randomRecentIso(rng, 14);
      const duration = 60 + Math.floor(rng() * 360);
      const disconnected = new Date(new Date(connected).getTime() + duration * 60000).toISOString();
      const trips = Math.floor(rng() * 12);
      sessions.push({
        sessionId: `session-sim-${++id}`,
        driverId: driver.id,
        vehicleId: driver.vehicleId,
        connectedAt: connected,
        disconnectedAt: disconnected,
        durationMinutes: duration,
        totalTrips: trips,
        totalKm: Math.round(trips * (2 + rng() * 4) * 10) / 10,
        totalCashCollected: Math.round(trips * (1.5 + rng() * 3) * 100) / 100,
      });
    }
  });

  return sessions;
}

function buildSubscriptions(rng: () => number, drivers: DriverProfileRecord[]): DriverSubscription[] {
  const subs: DriverSubscription[] = [];
  const pool = [...drivers].slice(0, COUNTS.subscriptions);
  let active = 0;
  let trial = 0;
  let pastDue = 0;
  let suspended = 0;

  pool.forEach((driver, i) => {
    const registered = new Date(monthsAgoIso(rng, 10));
    const sub = createDriverSubscription(driver.id, registered);
    const roll = rng();
    if (active < TARGET.driversActive && roll < 0.8) {
      sub.status = 'active';
      sub.lastPaidAt = randomRecentIso(rng, 25);
      sub.paymentMethod = pick(rng, ['visa_debit', 'mastercard_credit', 'visa_credit'] as const);
      sub.paymentProvider = pick(rng, ['wompi', 'bac', 'mock'] as const);
      active++;
    } else if (trial < TARGET.driversOnTrial && roll < 0.9) {
      sub.status = 'trial_until_next_month';
      trial++;
    } else if (pastDue < TARGET.driversPastDue) {
      sub.status = 'past_due';
      pastDue++;
    } else if (suspended < TARGET.driversSuspended) {
      sub.status = 'suspended';
      suspended++;
    } else {
      sub.status = 'active';
      sub.lastPaidAt = randomRecentIso(rng, 20);
      active++;
    }
    subs.push(sub);
  });

  return subs;
}

function buildRoleStats(
  rng: () => number,
  drivers: DriverProfileRecord[],
  owners: Owner[],
  vehicles: Vehicle[],
  businesses: BusinessProfile[]
): DemoRoleStats {
  const driverStats: DemoRoleStats['drivers'] = {};
  drivers.forEach((d) => {
    const tripsMonth = 40 + Math.floor(rng() * 180);
    const deliveriesMonth = Math.floor(rng() * 60);
    driverStats[d.id] = {
      earningsWeek: Math.round((80 + rng() * 420) * 100) / 100,
      earningsMonth: Math.round((320 + rng() * 1680) * 100) / 100,
      tripsWeek: Math.floor(tripsMonth * 0.22),
      tripsMonth,
      deliveriesWeek: Math.floor(deliveriesMonth * 0.25),
      deliveriesMonth,
      hoursConnectedWeek: Math.round((12 + rng() * 28) * 10) / 10,
      hoursConnectedMonth: Math.round((48 + rng() * 120) * 10) / 10,
    };
  });

  const ownerStats: DemoRoleStats['owners'] = {};
  owners.forEach((o) => {
    const ownerVehicles = vehicles.filter((v) => v.ownerId === o.id);
    const byUnit: OwnerDashboardStats['byUnit'] = {};
    let trips = 0;
    let deliveries = 0;
    let income = 0;
    let km = 0;
    ownerVehicles.forEach((v) => {
      const vTrips = 20 + Math.floor(rng() * 120);
      const vDel = Math.floor(rng() * 40);
      const vIncome = Math.round((vTrips * (2 + rng() * 4)) * 100) / 100;
      const vKm = Math.round(vTrips * (2.5 + rng() * 3) * 10) / 10;
      byUnit[v.vehicleId] = {
        unitNumber: v.unitNumber,
        trips: vTrips,
        deliveries: vDel,
        income: vIncome,
        km: vKm,
      };
      trips += vTrips;
      deliveries += vDel;
      income += vIncome;
      km += vKm;
    });
    ownerStats[o.id] = {
      income: Math.round(income * 100) / 100,
      trips,
      deliveries,
      kilometers: Math.round(km * 10) / 10,
      activeHours: Math.round((40 + rng() * 200) * 10) / 10,
      byUnit,
    };
  });

  const businessStats: DemoRoleStats['businesses'] = {};
  businesses.forEach((b) => {
    const deliveries = 30 + Math.floor(rng() * 200);
    businessStats[b.id] = {
      orders: deliveries + Math.floor(rng() * 40),
      deliveries,
      invoices: Math.floor(deliveries * 0.85),
      costs: Math.round((deliveries * (3 + rng() * 5)) * 100) / 100,
    };
  });

  return { drivers: driverStats, owners: ownerStats, businesses: businessStats };
}

function buildSimulationMeta(seed: number, tripHistory: TripHistoryRecord[]): DemoSimulationMeta {
  const cancellations = tripHistory.filter((t) => t.status === 'cancelled').length;
  return {
    version: 1,
    seed,
    generatedAt: new Date().toISOString(),
    totalPlatformUsers: TARGET.totalPlatformUsers,
    totalPassengers: COUNTS.passengers,
    totalDrivers: COUNTS.drivers,
    totalOwners: COUNTS.owners,
    totalBusinesses: COUNTS.businesses,
    totalVehicles: COUNTS.vehicles,
    totalTrips: TARGET.totalTrips,
    totalDeliveries: TARGET.totalDeliveries,
    tripsToday: TARGET.tripsToday,
    tripsWeek: TARGET.tripsWeek,
    tripsMonth: TARGET.tripsMonth,
    deliveriesToday: TARGET.deliveriesToday,
    deliveriesWeek: TARGET.deliveriesWeek,
    deliveriesMonth: TARGET.deliveriesMonth,
    driversActive: TARGET.driversActive,
    driversOnTrial: TARGET.driversOnTrial,
    driversPastDue: TARGET.driversPastDue,
    driversSuspended: TARGET.driversSuspended,
    driversConnected: TARGET.driversConnected,
    mrr: TARGET.mrr,
    arr: TARGET.arr,
    retentionPct: TARGET.retentionPct,
    churnPct: TARGET.churnPct,
    conversionPct: TARGET.conversionPct,
    avgArrivalMinutes: TARGET.avgArrivalMinutes,
    avgResponseSeconds: TARGET.avgResponseSeconds,
    complaints: Math.max(12, Math.floor(cancellations * 0.15)),
    reports: Math.max(6, Math.floor(cancellations * 0.08)),
    cancellations: Math.max(800, Math.floor(TARGET.totalTrips * 0.032)),
  };
}

/** Genera entorno demo de producción con volúmenes realistas. */
export async function buildProductionDemoStore(seed: number = DEMO_SEED): Promise<MockStoreData> {
  const rng = mulberry32(seed);
  const usedDuis = new Set<string>();
  const phones = uniquePhones(rng, COUNTS.passengers + COUNTS.drivers + COUNTS.owners + COUNTS.businesses + 5);
  let phoneIdx = 0;
  const nextPhone = () => phones[phoneIdx++];

  const makeName = () => `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;

  const admin = createUser('user-demo-admin', nextPhone(), 'Admin MOVI', makeDui(rng, usedDuis), 'admin', monthsAgoIso(rng));

  const passengerProfiles: PassengerProfileExtra[] = [];
  const passengers: AuthUser[] = [];
  for (let i = 0; i < COUNTS.passengers; i++) {
    const firstName = pick(rng, FIRST_NAMES);
    const lastName = pick(rng, LAST_NAMES);
    const city = pickWeighted(
      rng,
      CITIES.map((c) => c.name),
      CITIES.map((c) => c.weight)
    );
    const user = createUser(
      `user-demo-passenger-${i}`,
      nextPhone(),
      `${firstName} ${lastName}`,
      makeDui(rng, usedDuis),
      'passenger',
      monthsAgoIso(rng, 14)
    );
    passengers.push(user);
    passengerProfiles.push({
      userId: user.userId,
      firstName,
      lastName,
      city,
      profilePhotoUrl: `mock://avatar/passenger-${i % 500}`,
      tripCount: 0,
    });
  }

  const ownerUsers: AuthUser[] = [];
  const owners: Owner[] = [];
  for (let i = 0; i < COUNTS.owners; i++) {
    const user = createUser(`user-demo-owner-${i}`, nextPhone(), makeName(), makeDui(rng, usedDuis), 'owner', monthsAgoIso(rng, 12));
    ownerUsers.push(user);
    owners.push({
      id: `owner-sim-${i}`,
      userId: user.userId,
      name: user.fullName,
      phone: user.phoneNumber,
      dui: user.duiNumber,
      status: rng() < 0.92 ? 'approved' : pick(rng, ['under_review', 'documents_uploaded'] as const),
      documents: {
        duiFront: `mock://dui-front-${i}`,
        duiBack: `mock://dui-back-${i}`,
        selfie: `mock://selfie-${i}`,
        license: `mock://license-${i}`,
      },
      createdAt: user.createdAt,
    });
  }

  const vehicles: Vehicle[] = [];
  for (let i = 0; i < COUNTS.vehicles; i++) {
    const owner = owners[i % owners.length];
    const unitNum = String(1 + (i % 999)).padStart(3, '0');
    vehicles.push({
      vehicleId: `veh-sim-${i}`,
      unitId: generateUnitId(i),
      ownerId: owner.id,
      unitNumber: unitNum,
      plateNumber: `MTX-${String(100 + (i % 899))}`,
      registrationName: owner.name,
      associationName: pick(rng, ASSOCIATIONS),
      vehicleType: 'tuk_tuk_red',
      status: rng() < 0.88 ? 'approved' : pick(rng, ['under_review', 'draft'] as const),
      documents: {
        registrationCardImage: `mock://reg-${i}`,
        permitImage: `mock://permit-${i}`,
        platePhoto: `mock://plate-${i}`,
        unitPhoto: `mock://unit-${i}`,
        fullVehiclePhoto: `mock://vehicle-${i}`,
      },
      createdAt: monthsAgoIso(rng, 10),
    });
  }

  const driverUsers: AuthUser[] = [];
  const drivers: DriverProfileRecord[] = [];
  const inviteCodes: InviteCode[] = [];

  for (let i = 0; i < COUNTS.drivers; i++) {
    const user = createUser(`user-demo-driver-${i}`, nextPhone(), makeName(), makeDui(rng, usedDuis), 'driver', monthsAgoIso(rng, 10));
    driverUsers.push(user);
    const vehicle = vehicles[i % vehicles.length];
    const owner = owners.find((o) => o.id === vehicle.ownerId)!;
    const driverId = generateDriverPublicId(i);
    const statusRoll = rng();
    let status: DriverProfileRecord['status'] = 'approved';
    if (statusRoll < 0.04) status = 'suspended';
    else if (statusRoll < 0.08) status = 'pending';
    else if (statusRoll < 0.1) status = 'rejected';

    if (status === 'approved' && !vehicle.driverId) {
      vehicle.driverId = driverId;
    }

    const code = `MOVI-${String(1000 + i).slice(-4)}`;
    if (status === 'approved' && vehicle.driverId === driverId) {
      inviteCodes.push({
        code,
        vehicleId: vehicle.vehicleId,
        ownerId: owner.id,
        createdAt: user.createdAt,
        usedBy: driverId,
        usedAt: user.createdAt,
      });
    } else if (rng() < 0.15) {
      inviteCodes.push({ code, vehicleId: vehicle.vehicleId, ownerId: owner.id, createdAt: user.createdAt });
    }

    drivers.push({
      id: driverId,
      userId: user.userId,
      ownerId: owner.id,
      vehicleId: vehicle.vehicleId,
      name: user.fullName,
      phone: user.phoneNumber,
      status,
      inviteCodeUsed: status === 'approved' ? code : undefined,
      rating: Math.round((3.8 + rng() * 1.15) * 10) / 10,
      totalTrips: 50 + Math.floor(rng() * 2500),
      createdAt: user.createdAt,
    });
  }

  const businessUsers: AuthUser[] = [];
  const businesses: BusinessProfile[] = [];
  for (let i = 0; i < COUNTS.businesses; i++) {
    const user = createUser(`user-demo-business-${i}`, nextPhone(), makeName(), makeDui(rng, usedDuis), 'business', monthsAgoIso(rng, 8));
    businessUsers.push(user);
    const city = pick(rng, CITIES);
    businesses.push({
      id: `business-sim-${i}`,
      userId: user.userId,
      businessName: `${pick(rng, BUSINESS_NAMES)} ${i % 3 === 0 ? city.name : ''}`.trim(),
      businessType: pick(rng, BUSINESS_TYPES),
      responsibleDui: user.duiNumber,
      businessPhone: user.phoneNumber,
      nit: `0614-${String(Math.floor(100000 + rng() * 899999))}-001-${Math.floor(rng() * 9)}`,
      coordinates: { latitude: city.lat, longitude: city.lng },
      addressLabel: `${city.name}, El Salvador`,
      status: rng() < 0.9 ? 'approved' : 'pending',
      rating: Math.round((4 + rng() * 0.9) * 10) / 10,
      totalDeliveries: 10 + Math.floor(rng() * 400),
      createdAt: user.createdAt,
    });
  }

  const tripHistory = buildTrips(rng, passengers, drivers, passengerProfiles);
  const deliveryHistory = buildDeliveries(rng, businesses, drivers);
  const subscriptions = buildSubscriptions(rng, drivers);
  const sessions = buildSessions(rng, drivers, vehicles);
  const demandZones = buildDemandZones(rng);
  const simulationMeta = buildSimulationMeta(seed, tripHistory);
  const roleStats = buildRoleStats(rng, drivers, owners, vehicles, businesses);

  const openVehicle = vehicles.find((v) => v.status === 'approved' && !v.driverId);
  const inviteCodeOpen = inviteCodes.find((c) => !c.usedBy)?.code ?? 'MOVI-OPEN';
  const inviteCodeUsed = inviteCodes.find((c) => c.usedBy)?.code ?? 'MOVI-USED';

  seedDemoChatMessages(
    tripHistory.slice(0, 120).map((t) => t.tripId),
    deliveryHistory.slice(0, 80).map((d) => d.deliveryId),
    rng
  );

  const store: MockStoreData = {
    users: [admin, ...passengers, ...ownerUsers, ...driverUsers, ...businessUsers],
    owners,
    vehicles,
    drivers,
    businesses,
    subscriptions,
    sessions,
    inviteCodes,
    tripHistory,
    deliveryHistory,
    demandZones,
    currentUserId: null,
    otpPhone: null,
    simulationMeta,
    passengerProfiles,
    roleStats,
  };

  const manifest = buildDemoManifestFromStore(store);
  if (manifest) {
    await saveDemoManifest(manifest);
  }
  return store;
}
