import type {
  AuditLogRecord,
  DispatchCandidate,
  FinanceSummary,
  OperationalAlertRecord,
  SecuritySummary,
  SupportTicketRecord,
  Trip360Data,
} from '../types/adminCenter';
import { getMockOperationsLiveBundle } from './operationsLiveService';
import { getStore } from './mockStore';

export function getMockDispatchCandidates(tripId: string): DispatchCandidate[] {
  const bundle = getMockOperationsLiveBundle();
  return bundle.drivers.map((d, i) => ({
    driverId: d.driverId,
    name: d.name,
    rating: 4.5 + (i % 3) * 0.1,
    vehicleType: d.vehicleType,
    unitNumber: d.unitNumber,
    plateNumber: d.plateNumber,
    busy: d.busy,
    distanceKm: 1.2 + i * 0.4,
    etaMinutes: 4 + i,
    latitude: d.latitude,
    longitude: d.longitude,
    speed: d.speed,
    locationUpdatedAt: d.locationUpdatedAt,
  }));
}

export function getMockOperationalAlerts(): OperationalAlertRecord[] {
  const bundle = getMockOperationsLiveBundle();
  return bundle.alerts.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    status: 'open',
    entityType: 'trip',
    entityId: a.tripId,
    message: a.message,
    metadata: {},
    createdAt: a.createdAt,
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolvedBy: null,
  }));
}

export function getMockTrip360(tripId: string): Trip360Data | null {
  const bundle = getMockOperationsLiveBundle();
  const trip = bundle.trips.find((t) => t.id === tripId);
  if (!trip) return null;
  return {
    trip,
    passenger: { id: 'p1', fullName: trip.passengerName, phoneNumber: '70000000' },
    driver: null,
    vehicle: null,
    price: trip.passengerOfferPrice,
    timeline: [
      { step: 'requested', reached: true, at: new Date(trip.createdAt).toISOString() },
      { step: 'offered', reached: trip.lifecycleStatus !== 'requested', at: null },
      { step: 'accepted', reached: false, at: null },
      { step: 'trip_completed', reached: false, at: null },
      { step: 'cancelled', reached: trip.lifecycleStatus === 'cancelled', at: null },
    ],
    logs: { audit: [], notifications: [], otp: [] },
    liveDriver: null,
    ratings: [],
  };
}

export function getMockSupportTickets(): SupportTicketRecord[] {
  const store = getStore();
  const user = store.users[0];
  return [
    {
      id: 'ticket-mock-1',
      subject: 'Problema con viaje',
      description: 'Simulación',
      status: 'open',
      priority: 'medium',
      category: 'trip',
      assignedTo: null,
      tripId: null,
      driverId: null,
      businessId: null,
      user: {
        id: user?.userId ?? 'u1',
        fullName: user?.fullName ?? 'Usuario',
        phoneNumber: user?.phoneNumber ?? '',
        role: user?.role ?? 'passenger',
      },
      messageCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function getMockFinanceSummary(): FinanceSummary {
  return {
    revenueTodayUsd: 42,
    revenueMonthUsd: 890,
    commissionUsd: 133.5,
    activeSubscriptions: 12,
    failedPayments: 2,
    refunds: 1,
    mrr: 84,
    arr: 1008,
    serviceRevenue: { rides: 15, deliveries: 3, packages: 0, business: 0 },
    placeholder: true,
    note: 'Datos simulados',
  };
}

export function getMockSecuritySummary(): SecuritySummary {
  return {
    otpFailed24h: 3,
    suspiciousLogins24h: 1,
    suspendedUsers: 2,
    highCancelDrivers: 1,
    sosActive24h: 0,
    failedPayments24h: 2,
    recentAdminActions24h: 5,
  };
}

export function getMockAuditLogs(): AuditLogRecord[] {
  return [
    {
      id: 'audit-1',
      userId: 'admin',
      actor: { id: 'admin', fullName: 'Admin MOVI', role: 'admin' },
      actorRole: 'SUPER_ADMIN',
      action: 'dispatch',
      entityType: 'trip',
      entityId: 'trip-1',
      changes: {},
      before: {},
      after: {},
      createdAt: new Date().toISOString(),
    },
  ];
}
