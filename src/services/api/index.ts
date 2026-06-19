import {
  AuthUser,
  BusinessProfile,
  BusinessType,
  DeliveryHistoryRecord,
  DriverProfileRecord,
  DriverSession,
  DriverSubscription,
  InviteCode,
  Owner,
  OwnerDocuments,
  PlateCheckResult,
  SpecialCaseType,
  TripHistoryRecord,
  UserRole,
  Vehicle,
  VehicleDocuments,
  VehicleType,
} from '../../types/models';
import { ApiResponse } from '../../types/models';
import { Offer, TripRequest } from '../../types';
import { persistSession, logout as clearAuthSession } from '../authService';
import * as mock from '../mockApi/mockImpl';
import * as mockStore from '../mockStore';
import { useMockApi } from './config';
import { apiFetch, apiGet, apiPost } from './client';
import {
  getInvitePreviewFromCache,
  resolveCurrentProfiles as resolveCachedProfiles,
  setInvitePreviewCache,
  setProfileCache,
} from '../profileCache';
import { realtimeClient } from '../realtimeClient';
import { mapSubscription, mapVehicle } from '../apiMappers';

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

function fail<T>(error: string): ApiResponse<T> {
  return { ok: false, error };
}

async function persistAuthResponse(
  user: AuthUser,
  authToken: string,
  refreshToken?: string
): Promise<void> {
  await persistSession(user, authToken, refreshToken);
  setProfileCache({ user });
}

export async function requestOtp(phone: string): Promise<ApiResponse<{ sent: boolean }>> {
  if (useMockApi()) return mock.requestOtp(phone);
  const res = await apiPost<{ sent: boolean }>('/auth/request-otp', { phone }, { auth: false });
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al enviar OTP');
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<ApiResponse<{ verified: boolean; isNewUser: boolean }>> {
  if (useMockApi()) return mock.verifyOtp(phone, code);
  const res = await apiPost<{ verified: boolean; isNewUser: boolean }>(
    '/auth/verify-otp',
    { phone, code },
    { auth: false }
  );
  return res.ok ? ok(res.data!) : fail(res.error ?? 'OTP inválido');
}

export async function loginWithOtp(
  phone: string,
  dui: string,
  code: string
): Promise<ApiResponse<AuthUser>> {
  if (useMockApi()) return mock.loginWithOtp(phone, dui, code);
  const res = await apiPost<{ user: AuthUser; authToken: string; refreshToken?: string }>(
    '/auth/login',
    { phone, dui, code },
    { auth: false }
  );
  if (!res.ok || !res.data) return fail(res.error ?? 'Error al iniciar sesión');
  await persistAuthResponse(res.data.user, res.data.authToken, res.data.refreshToken);
  return ok(res.data.user);
}

export async function registerPassenger(
  phone: string,
  dui: string,
  fullName: string
): Promise<ApiResponse<AuthUser>> {
  if (useMockApi()) return mock.registerPassenger(phone, dui, fullName);
  const res = await apiPost<{ user: AuthUser; authToken: string }>(
    '/passengers/register',
    { phone, dui, fullName },
    { auth: false }
  );
  if (!res.ok || !res.data) return fail(res.error ?? 'Error al registrar');
  await persistAuthResponse(res.data.user, res.data.authToken);
  return ok(res.data.user);
}

export async function registerOwner(
  phone: string,
  fullName: string,
  dui: string
): Promise<ApiResponse<{ user: AuthUser; owner: Owner }>> {
  if (useMockApi()) return mock.registerOwner(phone, fullName, dui);
  const res = await apiPost<{ user: AuthUser; owner: Owner; authToken: string }>(
    '/owners/register',
    { phone, fullName, dui },
    { auth: false }
  );
  if (!res.ok || !res.data) return fail(res.error ?? 'Error al registrar');
  await persistAuthResponse(res.data.user, res.data.authToken);
  setProfileCache({ owner: res.data.owner });
  return ok({ user: res.data.user, owner: res.data.owner });
}

export async function uploadOwnerDocuments(
  ownerId: string,
  docs: Partial<OwnerDocuments>
): Promise<ApiResponse<Owner>> {
  if (useMockApi()) return mock.uploadOwnerDocuments(ownerId, docs);
  void ownerId;
  const res = await apiPost<Owner>('/owners/upload-documents', docs);
  if (res.ok && res.data) setProfileCache({ owner: res.data });
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al subir documentos');
}

export async function submitOwnerVerification(
  ownerId: string,
  specialCase?: SpecialCaseType,
  ownershipProofImage?: string
): Promise<ApiResponse<Owner>> {
  if (useMockApi()) return mock.submitOwnerVerification(ownerId, specialCase, ownershipProofImage);
  void ownerId;
  const res = await apiPost<Owner>('/owners/submit-verification', {
    specialCase,
    ownershipProofImage,
  });
  if (res.ok && res.data) setProfileCache({ owner: res.data });
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al enviar verificación');
}

export async function registerVehicle(
  ownerId: string,
  data: Pick<Vehicle, 'unitNumber' | 'plateNumber' | 'associationName'> & {
    vehicleType?: VehicleType;
    registrationName?: string;
    maxLoadKg?: number;
    bedLengthM?: number;
    hasCargoCover?: boolean;
  }
): Promise<ApiResponse<Vehicle>> {
  if (useMockApi()) return mock.registerVehicle(ownerId, data);
  void ownerId;
  const res = await apiPost<Vehicle>('/vehicles/register', data);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al registrar vehículo');
}

export async function uploadVehicleDocuments(
  vehicleId: string,
  docs: Partial<VehicleDocuments> & { registrationName?: string }
): Promise<ApiResponse<Vehicle>> {
  if (useMockApi()) return mock.uploadVehicleDocuments(vehicleId, docs);
  const res = await apiPost<Vehicle>(`/vehicles/${vehicleId}/upload-documents`, docs);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al subir documentos');
}

export async function submitVehicleVerification(
  vehicleId: string
): Promise<ApiResponse<Vehicle>> {
  if (useMockApi()) return mock.submitVehicleVerification(vehicleId);
  const res = await apiPost<Vehicle>(`/vehicles/${vehicleId}/submit-verification`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al enviar verificación');
}

export async function checkPlate(plate: string): Promise<ApiResponse<PlateCheckResult>> {
  if (useMockApi()) return mock.checkPlate(plate);
  const res = await apiGet<PlateCheckResult>(
    `/vehicles/check-plate/${encodeURIComponent(plate)}`,
    { auth: false }
  );
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al verificar placa');
}

export async function inviteDriver(vehicleId: string): Promise<ApiResponse<InviteCode>> {
  if (useMockApi()) return mock.inviteDriver(vehicleId);
  const res = await apiPost<InviteCode>(`/vehicles/${vehicleId}/invite-driver`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al generar invitación');
}

export async function registerDriverWithInvite(
  phone: string,
  dui: string,
  fullName: string,
  code: string
): Promise<ApiResponse<{ user: AuthUser; driver: DriverProfileRecord }>> {
  if (useMockApi()) return mock.registerDriverWithInvite(phone, dui, fullName, code);
  const res = await apiPost<{ user: AuthUser; driver: DriverProfileRecord; authToken: string }>(
    '/drivers/register-with-invite',
    { phone, dui, fullName, code },
    { auth: false }
  );
  if (!res.ok || !res.data) return fail(res.error ?? 'Error al registrar conductor');
  await persistAuthResponse(res.data.user, res.data.authToken);
  setProfileCache({ driver: res.data.driver });
  return ok({ user: res.data.user, driver: res.data.driver });
}

export async function registerBusiness(
  phone: string,
  fullName: string,
  dui: string,
  data: {
    businessName: string;
    businessType: BusinessType;
    businessPhone: string;
    nit?: string;
    latitude: number;
    longitude: number;
    addressLabel: string;
  }
): Promise<ApiResponse<{ user: AuthUser; business: BusinessProfile }>> {
  if (useMockApi()) return mock.registerBusiness(phone, fullName, dui, data);
  const res = await apiPost<{ user: AuthUser; business: BusinessProfile; authToken: string }>(
    '/businesses/register',
    { phone, fullName, dui, ...data },
    { auth: false }
  );
  if (!res.ok || !res.data) return fail(res.error ?? 'Error al registrar negocio');
  await persistAuthResponse(res.data.user, res.data.authToken);
  setProfileCache({ business: res.data.business });
  return ok({ user: res.data.user, business: res.data.business });
}

export async function updateUserProfilePhoto(
  userId: string,
  profilePhoto: string
): Promise<ApiResponse<AuthUser>> {
  if (useMockApi()) return mock.updateUserProfilePhoto(userId, profilePhoto);
  const res = await apiPost<AuthUser>('/auth/me/photo', { profilePhoto });
  if (res.ok && res.data) setProfileCache({ user: res.data });
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al actualizar foto');
}

export function saveCompletedDelivery(
  record: Omit<DeliveryHistoryRecord, 'id'>
): DeliveryHistoryRecord {
  return mock.saveCompletedDelivery(record);
}

export async function suspendOwner(ownerId: string): Promise<ApiResponse<Owner>> {
  if (useMockApi()) return fail('No disponible en mock');
  const res = await apiPost<Owner>(`/admin/owners/${ownerId}/suspend`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al suspender');
}

export async function suspendVehicle(vehicleId: string): Promise<ApiResponse<Vehicle>> {
  if (useMockApi()) return fail('No disponible en mock');
  const res = await apiPost<Vehicle>(`/admin/vehicles/${vehicleId}/suspend`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al suspender');
}

export async function suspendDriver(driverId: string): Promise<ApiResponse<DriverProfileRecord>> {
  if (useMockApi()) return fail('No disponible en mock');
  const res = await apiPost<DriverProfileRecord>(`/admin/drivers/${driverId}/suspend`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al suspender');
}

export async function fetchAdminProviders() {
  if (useMockApi()) return [];
  const res = await apiGet<{ providers: Record<string, unknown>[] }>('/admin/providers');
  return res.ok ? res.data?.providers ?? [] : [];
}

export async function fetchAdminTrips(status?: string) {
  if (useMockApi()) return [];
  const res = await apiGet<{ trips: TripRequest[] }>(`/admin/trips${status ? `?status=${status}` : ''}`);
  return res.ok ? res.data?.trips ?? [] : [];
}

export async function fetchAdminRequests() {
  if (useMockApi()) return [];
  const res = await apiGet<{ requests: TripRequest[] }>('/admin/requests');
  return res.ok ? res.data?.requests ?? [] : [];
}

export async function submitTripRatingApi(
  tripId: string,
  stars: number,
  comment: string | undefined,
  raterRole: 'passenger' | 'driver'
) {
  if (useMockApi()) return ok({ id: `rating-${Date.now()}`, stars });
  const res = await apiPost(`/trips/${tripId}/ratings`, { stars, comment, raterRole });
  return res.ok ? ok(res.data) : fail(res.error ?? 'Error al calificar');
}

export async function uploadDocumentFile(uri: string, fileName?: string): Promise<ApiResponse<string>> {
  if (useMockApi()) return ok(`mock://${fileName ?? 'doc'}-${Date.now()}`);
  try {
    const { uploadFile } = await import('../uploadService');
    const url = await uploadFile(uri, fileName);
    return ok(url);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Error al subir');
  }
}

export async function approveOwner(ownerId: string): Promise<ApiResponse<Owner>> {
  if (useMockApi()) return mock.approveOwner(ownerId);
  const res = await apiPost<Owner>(`/admin/owners/${ownerId}/approve`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al aprobar dueño');
}

export async function rejectOwner(ownerId: string): Promise<ApiResponse<Owner>> {
  if (useMockApi()) return mock.rejectOwner(ownerId);
  const res = await apiPost<Owner>(`/admin/owners/${ownerId}/reject`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al rechazar dueño');
}

export async function approveVehicle(vehicleId: string): Promise<ApiResponse<Vehicle>> {
  if (useMockApi()) return mock.approveVehicle(vehicleId);
  const res = await apiPost<Vehicle>(`/admin/vehicles/${vehicleId}/approve`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al aprobar vehículo');
}

export async function rejectVehicle(vehicleId: string): Promise<ApiResponse<Vehicle>> {
  if (useMockApi()) return mock.rejectVehicle(vehicleId);
  const res = await apiPost<Vehicle>(`/admin/vehicles/${vehicleId}/reject`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al rechazar vehículo');
}

export async function approveDriver(
  driverId: string
): Promise<ApiResponse<DriverProfileRecord>> {
  if (useMockApi()) return mock.approveDriver(driverId);
  const res = await apiPost<DriverProfileRecord>(`/admin/drivers/${driverId}/approve`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al aprobar conductor');
}

export async function rejectDriver(
  driverId: string
): Promise<ApiResponse<DriverProfileRecord>> {
  if (useMockApi()) return mock.rejectDriver(driverId);
  const res = await apiPost<DriverProfileRecord>(`/admin/drivers/${driverId}/reject`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al rechazar conductor');
}

export async function startDriverSession(
  driverId: string,
  vehicleId: string
): Promise<ApiResponse<DriverSession>> {
  if (useMockApi()) return mock.startDriverSession(driverId, vehicleId);
  const res = await apiPost<DriverSession>(`/drivers/${driverId}/sessions/start`, { vehicleId });
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al conectar');
}

export async function endDriverSession(
  driverId: string,
  stats?: Partial<Pick<DriverSession, 'totalTrips' | 'totalKm' | 'totalCashCollected'>>
): Promise<ApiResponse<DriverSession>> {
  if (useMockApi()) return mock.endDriverSession(driverId, stats);
  const res = await apiPost<DriverSession>(`/drivers/${driverId}/sessions/end`, stats ?? {});
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al desconectar');
}

export function saveCompletedTrip(record: Omit<TripHistoryRecord, 'id'>): TripHistoryRecord {
  if (useMockApi()) return mock.saveCompletedTrip(record);
  void apiPost('/trips/complete', record).catch(() => undefined);
  return { ...record, id: record.tripId };
}

export function fetchTripHistory(filters?: {
  passengerId?: string;
  driverId?: string;
  ownerId?: string;
}): TripHistoryRecord[] {
  if (useMockApi()) return mock.fetchTripHistory(filters);
  void filters;
  return resolveCachedProfiles().user ? [] : [];
}

export async function fetchTripHistoryForRole(): Promise<TripHistoryRecord[]> {
  if (useMockApi()) return mock.fetchTripHistory();
  return fetchTripHistoryAsync();
}

export async function fetchTripHistoryAsync(): Promise<TripHistoryRecord[]> {
  if (useMockApi()) return mock.fetchTripHistory();
  const res = await apiGet<{ trips: TripRequest[] }>('/trips/history');
  if (!res.ok || !res.data?.trips) return [];
  const mapped = res.data.trips.map((t) => ({
    id: t.id,
    tripId: t.id,
    passengerId: t.passengerId ?? '',
    passengerName: t.passengerName,
    driverId: t.acceptedOffer?.driverId ?? '',
    driverName: t.acceptedOffer?.driver?.name ?? 'Conductor',
    originName: t.origin.name,
    destinationName: t.destination.name,
    distanceKm: t.distanceKm,
    price: t.acceptedOffer?.price ?? 0,
    durationMinutes: 15,
    status: t.lifecycleStatus ?? 'trip_completed',
    completedAt: new Date(t.completedAt ?? Date.now()).toISOString(),
  }));
  setProfileCache({ tripHistory: mapped });
  return mapped;
}

export async function fetchOwnerVehicles(): Promise<ApiResponse<Vehicle[]>> {
  if (useMockApi()) {
    const { owner } = mock.resolveCurrentProfiles();
    const vehicles = owner
      ? mockStore.getStore().vehicles.filter((v) => v.ownerId === owner.id)
      : [];
    return ok(vehicles);
  }
  const res = await apiGet<{ vehicles: Record<string, unknown>[] }>('/users/me/vehicles');
  if (!res.ok || !res.data?.vehicles) return fail(res.error ?? 'Error al cargar vehículos');
  const vehicles = res.data.vehicles.map((v) => mapVehicle(v));
  const ownerDrivers: DriverProfileRecord[] = [];
  for (const raw of res.data.vehicles) {
    const driver = raw.driver as {
      id?: string;
      name?: string;
      phone?: string;
      status?: string;
    } | null;
    if (driver?.id) {
      ownerDrivers.push({
        id: String(driver.id),
        userId: '',
        ownerId: String(raw.ownerId ?? ''),
        vehicleId: String(raw.vehicleId ?? raw.id ?? ''),
        name: String(driver.name ?? 'Conductor'),
        phone: String(driver.phone ?? ''),
        status: (driver.status as DriverProfileRecord['status']) ?? 'approved',
        rating: 5,
        totalTrips: 0,
        createdAt: String(raw.createdAt ?? new Date().toISOString()),
      });
    }
  }
  setProfileCache({ vehicles, ownerDrivers });
  return ok(vehicles);
}

export async function fetchDriverSubscription(): Promise<DriverSubscription | null> {
  if (useMockApi()) {
    const { driver } = mock.resolveCurrentProfiles();
    return driver ? mockStore.getDriverSubscription(driver.id) ?? null : null;
  }
  const res = await apiGet<{ subscription: Record<string, unknown> | null }>('/subscriptions/me');
  if (!res.ok || !res.data?.subscription) return null;
  const sub = mapSubscription(res.data.subscription);
  setProfileCache({ subscription: sub });
  return sub;
}

export async function payDriverSubscription(): Promise<ApiResponse<{ ok: boolean }>> {
  if (useMockApi()) return fail('Usar mock en modo demo');
  const res = await apiPost<{ ok: boolean }>('/subscriptions/pay');
  if (res.ok) {
    await fetchDriverSubscription();
  }
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al procesar pago');
}

export function fetchDriverSessions(driverId: string): DriverSession[] {
  if (useMockApi()) return mock.fetchDriverSessions(driverId);
  return [];
}

export async function fetchDriverSessionsAsync(driverId: string): Promise<DriverSession[]> {
  if (useMockApi()) return mock.fetchDriverSessions(driverId);
  const res = await apiGet<DriverSession[]>(`/drivers/${driverId}/sessions`);
  return res.ok && res.data ? res.data : [];
}

export async function fetchUserProfiles() {
  if (useMockApi()) return mock.resolveCurrentProfiles();
  const res = await apiGet<{
    user: AuthUser;
    owner: Owner | null;
    driver: DriverProfileRecord | null;
    business: BusinessProfile | null;
  }>('/users/me/profiles');
  if (res.ok && res.data) {
    setProfileCache({
      user: res.data.user,
      owner: res.data.owner,
      driver: res.data.driver,
      business: res.data.business,
    });
    return res.data;
  }
  return resolveCachedProfiles();
}

export async function fetchAdminKpis() {
  if (useMockApi()) return null;
  const res = await apiGet<Record<string, unknown>>('/admin/kpis');
  return res.ok ? res.data : null;
}

export async function fetchAdminMetricsSummary() {
  if (useMockApi()) return null;
  const res = await apiGet<import('../../types/adminMetrics').AdminMetricsSummary>(
    '/admin/metrics/summary'
  );
  return res.ok ? res.data : null;
}

export async function fetchAdminMetricsProviders() {
  if (useMockApi()) return null;
  const res = await apiGet<import('../../types/adminMetrics').AdminMetricsProviders>(
    '/admin/metrics/providers'
  );
  return res.ok ? res.data : null;
}

export async function fetchAdminMetricsTrips() {
  if (useMockApi()) return null;
  const res = await apiGet<import('../../types/adminMetrics').AdminMetricsTrips>(
    '/admin/metrics/trips'
  );
  return res.ok ? res.data : null;
}

export async function fetchAdminMetricsRatings() {
  if (useMockApi()) return null;
  const res = await apiGet<import('../../types/adminMetrics').AdminMetricsRatings>(
    '/admin/metrics/ratings'
  );
  return res.ok ? res.data : null;
}

export async function fetchAdminMetricsSubscriptions() {
  if (useMockApi()) return null;
  const res = await apiGet<import('../../types/adminMetrics').AdminMetricsSubscriptions>(
    '/admin/metrics/subscriptions'
  );
  return res.ok ? res.data : null;
}

export async function fetchAdminMetricsRecentActivity() {
  if (useMockApi()) return null;
  const res = await apiGet<import('../../types/adminMetrics').AdminMetricsRecentActivity>(
    '/admin/metrics/recent-activity'
  );
  return res.ok ? res.data : null;
}

export async function fetchAdminMetricsBundle(): Promise<
  import('../../types/adminMetrics').AdminMetricsBundle
> {
  if (useMockApi()) {
    return {
      summary: null,
      providers: null,
      trips: null,
      ratings: null,
      subscriptions: null,
      recentActivity: null,
    };
  }
  const [summary, providers, trips, ratings, subscriptions, recentActivity] = await Promise.all([
    fetchAdminMetricsSummary(),
    fetchAdminMetricsProviders(),
    fetchAdminMetricsTrips(),
    fetchAdminMetricsRatings(),
    fetchAdminMetricsSubscriptions(),
    fetchAdminMetricsRecentActivity(),
  ]);
  return {
    summary: summary ?? null,
    providers: providers ?? null,
    trips: trips ?? null,
    ratings: ratings ?? null,
    subscriptions: subscriptions ?? null,
    recentActivity: recentActivity ?? null,
  };
}

export async function fetchPendingVerifications() {
  if (useMockApi()) {
    const store = mockStore.getStore();
    return {
      owners: store.owners.filter((o) => o.status === 'under_review'),
      vehicles: store.vehicles.filter((v) => v.status === 'under_review'),
      drivers: store.drivers.filter((d) => d.status === 'pending'),
    };
  }
  const res = await apiGet<Record<string, unknown>>('/admin/verifications/pending');
  return res.ok ? res.data : null;
}

export async function fetchDemandZones(): Promise<import('../../types/models').DemandZone[]> {
  if (useMockApi()) return mock.fetchDemandZones();
  const res = await apiGet<ReturnType<typeof mock.fetchDemandZones>>('/demand-zones', { auth: false });
  if (res.ok && res.data) return res.data;
  return [];
}

export async function logout(): Promise<void> {
  if (useMockApi()) {
    await mock.logout();
    return;
  }
  const refreshToken = await import('@react-native-async-storage/async-storage').then((m) =>
    m.default.getItem('movi_session_refreshToken')
  );
  if (refreshToken) {
    await apiPost('/auth/logout', { refreshToken }, { auth: false }).catch(() => undefined);
  }
  await clearAuthSession();
}

export function setUserRole(userId: string, role: UserRole): AuthUser | null {
  if (useMockApi()) return mock.setUserRole(userId, role);
  void userId;
  void role;
  return resolveCachedProfiles().user;
}

export function getInvitePreview(code: string): {
  code: InviteCode;
  vehicle: Vehicle;
  owner: Owner;
} | null {
  if (useMockApi()) return mock.getInvitePreview(code);
  return getInvitePreviewFromCache(code);
}

export async function fetchInvitePreview(code: string): Promise<{
  code: InviteCode;
  vehicle: Vehicle;
  owner: Owner;
} | null> {
  if (useMockApi()) return mock.getInvitePreview(code);
  const res = await apiGet<{ code: InviteCode; vehicle: Vehicle; owner: Owner }>(
    `/drivers/invites/${encodeURIComponent(code)}/preview`,
    { auth: false }
  );
  if (!res.ok || !res.data) return null;
  setInvitePreviewCache(res.data);
  return res.data;
}

export function resolveCurrentProfiles() {
  if (useMockApi()) return mock.resolveCurrentProfiles();
  return resolveCachedProfiles();
}

export async function fetchMe(): Promise<ApiResponse<AuthUser>> {
  if (useMockApi()) {
    const { user } = mock.resolveCurrentProfiles();
    return user ? ok(user) : fail('No autenticado');
  }
  const res = await apiGet<AuthUser>('/auth/me');
  if (res.ok && res.data) setProfileCache({ user: res.data });
  return res;
}

export async function requestTripOnBackend(
  trip: TripRequest
): Promise<ApiResponse<TripRequest>> {
  if (useMockApi()) return ok(trip);
  const res = await apiPost<TripRequest>('/trips/request', {
    origin: trip.origin,
    destination: trip.destination,
    tripType: trip.tripType,
    kind: trip.kind,
    passengerCount: trip.passengerCount,
    description: trip.description,
    photoUris: trip.photoUris,
    serviceType: trip.serviceType,
    requestType: trip.requestType,
    deliveryCategory: trip.deliveryCategory,
    businessId: trip.businessId,
    businessName: trip.businessName,
    passengerOfferPrice: trip.passengerOfferPrice,
    passengerName: trip.passengerName,
    cargoDetails: (trip as TripRequest & { cargoDetails?: Record<string, unknown> }).cargoDetails,
    requestMode: trip.requestMode ?? 'NOW',
    scheduledAt: trip.scheduledAt ? new Date(trip.scheduledAt).toISOString() : undefined,
    requiredVehicleType: trip.requiredVehicleType,
  });
  if (res.ok && res.data) {
    realtimeClient.subscribeTrip(res.data.id);
    return ok(res.data);
  }
  return fail(res.error ?? 'Error al solicitar viaje');
}

export async function submitTripOffer(
  tripId: string,
  price: number,
  etaMinutes?: number
): Promise<ApiResponse<{ offer: Offer; trip: TripRequest }>> {
  if (useMockApi()) return fail('Usar mock submitDriverOffer');
  const res = await apiPost<{ offer: Offer; trip: TripRequest }>(`/trips/${tripId}/offers`, {
    price,
    etaMinutes,
  });
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al enviar oferta');
}

export async function acceptTripOffer(
  tripId: string,
  offerId: string
): Promise<ApiResponse<TripRequest>> {
  if (useMockApi()) return fail('Usar mock acceptOffer');
  const res = await apiPost<TripRequest>(`/trips/${tripId}/offers/${offerId}/accept`);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al aceptar oferta');
}

export async function fetchAvailableTrips(): Promise<ApiResponse<TripRequest[]>> {
  if (useMockApi()) return ok([]);
  const res = await apiGet<{ trips: TripRequest[] }>('/trips/available');
  return res.ok ? ok(res.data?.trips ?? []) : fail(res.error ?? 'Error al cargar solicitudes');
}

export async function fetchScheduledTrips(): Promise<ApiResponse<TripRequest[]>> {
  if (useMockApi()) return ok([]);
  const res = await apiGet<{ trips: TripRequest[] }>('/trips/available/scheduled');
  return res.ok ? ok(res.data?.trips ?? []) : fail(res.error ?? 'Error al cargar programadas');
}

export async function fetchDriverReservations(): Promise<ApiResponse<TripRequest[]>> {
  if (useMockApi()) return ok([]);
  const res = await apiGet<{ trips: TripRequest[] }>('/trips/reservations');
  return res.ok ? ok(res.data?.trips ?? []) : fail(res.error ?? 'Error al cargar reservas');
}

export async function fetchChatMessages(
  tripId: string
): Promise<ApiResponse<{ id: string; tripId: string; senderId: string; senderRole: string; text: string; createdAt: number }[]>> {
  if (useMockApi()) return ok([]);
  const res = await apiGet<{ messages: { id: string; tripId: string; senderId: string; senderRole: string; text: string; createdAt: number }[] }>(
    `/trips/${tripId}/chat`
  );
  return res.ok ? ok(res.data?.messages ?? []) : fail(res.error ?? 'Error al cargar chat');
}

export async function cancelTripOnBackend(
  tripId: string,
  by: 'passenger' | 'driver' = 'passenger'
): Promise<ApiResponse<TripRequest>> {
  if (useMockApi()) return fail('Usar mock cancelTrip');
  const res = await apiPost<TripRequest>(`/trips/${tripId}/cancel`, { by });
  if (res.ok) realtimeClient.unsubscribeTrip(tripId);
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al cancelar');
}

export async function advanceTripOnBackend(
  tripId: string,
  lifecycleStatus: string
): Promise<ApiResponse<TripRequest>> {
  if (useMockApi()) return fail('Usar mock advanceTripLifecycle');
  const res = await apiFetch<TripRequest>(`/trips/${tripId}/lifecycle`, {
    method: 'PATCH',
    body: { lifecycleStatus },
  });
  return res.ok ? ok(res.data!) : fail(res.error ?? 'Error al actualizar viaje');
}

export { useMockApi } from './config';
export { apiFetch, apiGet, apiPost } from './client';
