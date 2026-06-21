export type DispatchCandidate = {
  driverId: string;
  name: string;
  rating: number;
  vehicleType: string | null;
  unitNumber: string | null;
  plateNumber: string | null;
  busy: boolean;
  distanceKm: number | null;
  etaMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  locationUpdatedAt: string | null;
};

export type OperationalAlertRecord = {
  id: string;
  type: string;
  severity: 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  entityType: string;
  entityId: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type Trip360Data = {
  trip: import('./index').TripRequest;
  passenger: { id: string; fullName: string; phoneNumber: string } | null;
  driver: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    userId: string;
  } | null;
  vehicle: {
    unitNumber: string;
    plateNumber: string;
    vehicleType: string;
  } | null;
  price: number | null | undefined;
  timeline: { step: string; reached: boolean; at: string | null }[];
  logs: {
    audit: Array<{
      id: string;
      action: string;
      actorRole: string | null;
      userId: string | null;
      createdAt: string;
      changes: Record<string, unknown>;
    }>;
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      createdAt: string;
    }>;
    otp: Array<{ id: string; verified: boolean; createdAt: string }>;
  };
  liveDriver: {
    latitude: number | null;
    longitude: number | null;
    speed: number | null;
    locationUpdatedAt: string | null;
  } | null;
  ratings?: Array<{
    id: string;
    raterRole: string;
    rateeRole: string;
    stars: number;
    comment?: string;
    createdAt: string;
  }>;
};

export type SupportTicketRecord = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  assignedTo: string | null;
  tripId: string | null;
  driverId: string | null;
  businessId: string | null;
  user: { id: string; fullName: string; phoneNumber: string; role: string };
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type FinanceSummary = {
  revenueTodayUsd: number;
  revenueMonthUsd: number;
  commissionUsd: number;
  activeSubscriptions: number;
  failedPayments: number;
  refunds: number;
  mrr: number;
  arr: number;
  serviceRevenue: Record<string, number>;
  placeholder?: boolean;
  note?: string;
};

export type SecuritySummary = {
  otpFailed24h: number;
  suspiciousLogins24h: number;
  suspendedUsers: number;
  highCancelDrivers: number;
  sosActive24h: number;
  failedPayments24h: number;
  recentAdminActions24h: number;
};

export type AuditLogRecord = {
  id: string;
  userId: string | null;
  actor: { id: string; fullName: string; role: string } | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
};
