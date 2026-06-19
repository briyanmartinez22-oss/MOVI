export type AdminMetricsSummary = {
  totalPassengers: number;
  totalProviders: number;
  providersPendingVerification: number;
  providersVerified: number;
  providersSuspended: number;
  tripsRequested: number;
  tripsActive: number;
  tripsCompleted: number;
  tripsCancelled: number;
  totalOffers: number;
  avgProviderRating: number;
  avgProviderRatingCount: number;
  avgPassengerRating: number;
  avgPassengerRatingCount: number;
  driversOnline: number;
  subscriptionsActive: number;
  subscriptionsExpired: number;
  projectedMonthlyRevenueUsd: number;
  monthlySubscriptionFeeUsd: number;
};

export type AdminMetricsProviders = {
  totalDrivers: number;
  totalOwners: number;
  totalVehicles: number;
  driversByStatus: Record<string, number>;
  ownersByStatus: Record<string, number>;
  vehiclesByStatus: Record<string, number>;
  driversOnline: number;
};

export type AdminMetricsTrips = {
  byLifecycle: Record<string, number>;
  tripsToday: number;
  tripsWeek: number;
  tripsMonth: number;
  pendingRequests: number;
  tripsActive: number;
  tripsCompleted: number;
  tripsCancelled: number;
  offersToday: number;
  offersTotal: number;
};

export type AdminMetricsRatings = {
  providers: { average: number; count: number; min: number; max: number };
  passengers: { average: number; count: number; min: number; max: number };
  recent: {
    id: string;
    tripId: string;
    raterRole: string;
    rateeRole: string;
    stars: number;
    createdAt: string;
  }[];
};

export type AdminMetricsSubscriptions = {
  byStatus: Record<string, number>;
  total: number;
  active: number;
  trial: number;
  pastDue: number;
  suspended: number;
  expired: number;
  projectedMonthlyRevenueUsd: number;
  monthlyFeeUsd: number;
};

export type AdminMetricsRecentActivity = {
  trips: {
    id: string;
    passengerName: string;
    lifecycleStatus: string;
    createdAt: string;
  }[];
  driverRegistrations: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }[];
  offers: {
    id: string;
    tripId: string;
    driverName: string;
    price: number;
    status: string;
    createdAt: string;
  }[];
};

export type AdminMetricsBundle = {
  summary: AdminMetricsSummary | null;
  providers: AdminMetricsProviders | null;
  trips: AdminMetricsTrips | null;
  ratings: AdminMetricsRatings | null;
  subscriptions: AdminMetricsSubscriptions | null;
  recentActivity: AdminMetricsRecentActivity | null;
};
