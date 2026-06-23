import {
  ApiResponse,
  AuthUser,
  BusinessProfile,
  BusinessType,
  DeliveryHistoryRecord,
  DriverProfileRecord,
  DriverSession,
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
import { createDriverSubscription } from '../subscriptionService';
import * as otpService from '../otpService';
import {
  addTripHistory,
  addDeliveryHistory,
  createUser,
  generateId,
  generateInviteCode,
  getAllSessionsByDriver,
  getCurrentUser,
  getDemandZones,
  getDriverByUserId,
  getOwnerByUserId,
  getStore,
  getTripHistory,
  getVehicle,
  getVehicleByUnitId,
  setCurrentUser,
  updateStore,
  findUserByPhone,
  findUserByPhoneAndDui,
  ensureStoreReady,
} from '../mockStore';
import {
  generateDriverPublicId,
  generateUnitId,
  namesMatch,
  normalizeDui,
  normalizePhone,
} from '../../utils/platform';
import { canDriverOperateSubscription } from '../subscriptionService';
import { persistSession, logout as clearAuthSession } from '../authService';

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

function fail<T>(error: string): ApiResponse<T> {
  return { ok: false, error };
}

export async function requestOtp(phone: string): Promise<ApiResponse<{ sent: boolean }>> {
  await ensureStoreReady();
  const res = await otpService.requestOtp(phone);
  if (!res.ok) return fail(res.error ?? 'Error al enviar OTP');
  updateStore((s) => ({ ...s, otpPhone: normalizePhone(phone) }));
  return ok({ sent: true });
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<ApiResponse<{ verified: boolean; isNewUser: boolean; existingRole?: string | null }>> {
  await ensureStoreReady();
  const res = await otpService.verifyOtp(phone, code, findUserByPhone);
  if (!res.ok) return fail(res.error ?? 'OTP inválido');
  const existing = findUserByPhone(phone);
  return ok({ verified: true, isNewUser: res.isNewUser ?? false, existingRole: existing?.role ?? null });
}

export async function loginWithPassword(
  phone: string,
  password: string
): Promise<ApiResponse<AuthUser>> {
  await ensureStoreReady();
  const byPhone = findUserByPhone(phone);
  if (!byPhone) return fail('Teléfono o contraseña incorrectos.');
  if (byPhone.role === 'admin') {
    return fail('Las cuentas administrativas usan OTP.');
  }
  const stored = getStore().passwords?.[normalizePhone(phone)];
  if (!stored || stored !== password) {
    return fail('Teléfono o contraseña incorrectos.');
  }
  setCurrentUser(byPhone.userId);
  await persistSession(byPhone);
  return ok(byPhone);
}

export async function loginWithOtp(
  phone: string,
  dui: string | undefined,
  code: string
): Promise<ApiResponse<AuthUser>> {
  await ensureStoreReady();
  const verify = await verifyOtp(phone, code);
  if (!verify.ok) return fail(verify.error!);

  const byPhone = findUserByPhone(phone);
  if (!byPhone) return fail('Usuario no registrado. Completa el registro.');

  if (byPhone.role !== 'passenger') {
    if (!dui?.trim()) return fail('El DUI es requerido para este tipo de cuenta.');
    const existing = findUserByPhoneAndDui(phone, dui);
    if (!existing) return fail('El DUI no coincide con el registrado.');
  }

  updateStore((s) => ({
    ...s,
    users: s.users.map((u) =>
      u.userId === byPhone.userId
        ? { ...u, phoneVerified: true, updatedAt: new Date().toISOString() }
        : u
    ),
    currentUserId: byPhone.userId,
  }));

  const user = getCurrentUser()!;
  await persistSession(user);
  return ok(user);
}

export async function registerPassenger(
  phone: string,
  fullName: string,
  password?: string
): Promise<ApiResponse<AuthUser>> {
  if (findUserByPhone(phone)) return fail('Este teléfono ya está registrado.');
  const user = createUser(phone, fullName, '', 'passenger');
  const pwd = password ?? 'QaTest123';
  updateStore((s) => ({
    ...s,
    users: [...s.users, user],
    currentUserId: user.userId,
    passwords: { ...(s.passwords ?? {}), [normalizePhone(phone)]: pwd },
  }));
  await persistSession(user);
  return ok(user);
}

export async function registerOwner(
  phone: string,
  fullName: string,
  dui: string
): Promise<ApiResponse<{ user: AuthUser; owner: Owner }>> {
  if (findUserByPhone(phone)) return fail('Este teléfono ya está registrado.');
  const user = createUser(phone, fullName, normalizeDui(dui), 'owner');
  const owner: Owner = {
    id: generateId('owner'),
    userId: user.userId,
    name: fullName,
    phone: normalizePhone(phone),
    dui: normalizeDui(dui),
    status: 'pending',
    documents: {},
    createdAt: new Date().toISOString(),
  };
  updateStore((s) => ({
    ...s,
    users: [...s.users, user],
    owners: [...s.owners, owner],
    currentUserId: user.userId,
  }));
  await persistSession(user);
  return ok({ user, owner });
}

export async function uploadOwnerDocuments(
  ownerId: string,
  docs: Partial<OwnerDocuments>
): Promise<ApiResponse<Owner>> {
  let updated: Owner | undefined;
  updateStore((s) => {
    const owners = s.owners.map((o) => {
      if (o.id !== ownerId) return o;
      updated = {
        ...o,
        documents: { ...o.documents, ...docs },
        status: docs.selfie ? 'under_review' : 'documents_uploaded',
      };
      return updated;
    });
    return { ...s, owners };
  });
  return updated ? ok(updated) : fail('Dueño no encontrado');
}

export async function submitOwnerVerification(
  ownerId: string,
  specialCase?: SpecialCaseType,
  ownershipProofImage?: string
): Promise<ApiResponse<Owner>> {
  let updated: Owner | undefined;
  updateStore((s) => {
    const owners = s.owners.map((o) => {
      if (o.id !== ownerId) return o;
      updated = {
        ...o,
        status: 'under_review',
        specialCase,
        ownershipProofImage,
      };
      return updated;
    });
    return { ...s, owners };
  });
  return updated ? ok(updated) : fail('Dueño no encontrado');
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
  const plateCheck = await checkPlate(data.plateNumber);
  if (!plateCheck.ok || !plateCheck.data?.available) {
    return fail(plateCheck.data?.message ?? 'Placa no disponible');
  }

  const owner = getStore().owners.find((o) => o.id === ownerId);
  if (!owner) return fail('Dueño no encontrado');

  const unitId = generateUnitId(getStore().vehicles.length);

  if (getVehicleByUnitId(unitId)) {
    return fail('Esta unidad ya existe en el sistema.');
  }

  const vehicle: Vehicle = {
    vehicleId: generateId('veh'),
    unitId,
    ownerId,
    unitNumber: data.unitNumber,
    plateNumber: data.plateNumber.toUpperCase(),
    registrationName: data.registrationName,
    associationName: data.associationName,
    vehicleType: data.vehicleType ?? 'mototaxi',
    maxLoadKg: data.maxLoadKg,
    bedLengthM: data.bedLengthM,
    hasCargoCover: data.hasCargoCover,
    status: 'draft',
    documents: {},
    createdAt: new Date().toISOString(),
  };
  updateStore((s) => ({ ...s, vehicles: [...s.vehicles, vehicle] }));
  return ok(vehicle);
}

export async function uploadVehicleDocuments(
  vehicleId: string,
  docs: Partial<VehicleDocuments> & { registrationName?: string }
): Promise<ApiResponse<Vehicle>> {
  let updated: Vehicle | undefined;
  updateStore((s) => {
    const vehicles = s.vehicles.map((v) => {
      if (v.vehicleId !== vehicleId) return v;
      updated = {
        ...v,
        documents: { ...v.documents, ...docs },
        registrationName: docs.registrationName ?? v.registrationName,
        status: 'documents_uploaded',
      };
      return updated;
    });
    return { ...s, vehicles };
  });
  return updated ? ok(updated) : fail('Vehículo no encontrado');
}

export async function submitVehicleVerification(
  vehicleId: string
): Promise<ApiResponse<Vehicle>> {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return fail('Vehículo no encontrado');

  const owner = getStore().owners.find((o) => o.id === vehicle.ownerId);
  if (!owner) return fail('Dueño no encontrado');

  const regName = vehicle.registrationName ?? '';
  if (regName && !namesMatch(owner.name, regName)) {
    let incomplete: Vehicle | undefined;
    updateStore((s) => {
      const vehicles = s.vehicles.map((v) => {
        if (v.vehicleId !== vehicleId) return v;
        incomplete = {
          ...v,
          status: 'incomplete',
          rejectReason:
            'El nombre en la tarjeta de circulación no coincide con el DUI del dueño.',
        };
        return incomplete;
      });
      return { ...s, vehicles };
    });
    return fail(
      'El nombre en tarjeta de circulación no coincide con el registrado. Corrige los datos y vuelve a enviar.'
    );
  }

  let updated: Vehicle | undefined;
  updateStore((s) => {
    const vehicles = s.vehicles.map((v) => {
      if (v.vehicleId !== vehicleId) return v;
      updated = { ...v, status: 'under_review' };
      return updated;
    });
    return { ...s, vehicles };
  });
  return updated ? ok(updated) : fail('Vehículo no encontrado');
}

export async function checkPlate(plate: string): Promise<ApiResponse<PlateCheckResult>> {
  const normalized = plate.toUpperCase().trim();
  const existing = getStore().vehicles.find((v) => v.plateNumber === normalized);
  if (existing) {
    return ok({
      available: false,
      message: 'Esta unidad ya está registrada por otro dueño.',
      existingOwnerId: existing.ownerId,
    });
  }
  return ok({ available: true });
}

export async function inviteDriver(vehicleId: string): Promise<ApiResponse<InviteCode>> {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return fail('Vehículo no encontrado');
  if (vehicle.status !== 'approved') return fail('La unidad debe estar aprobada.');

  const code = generateInviteCode();
  const invite: InviteCode = {
    code,
    vehicleId,
    ownerId: vehicle.ownerId,
    createdAt: new Date().toISOString(),
  };
  updateStore((s) => ({ ...s, inviteCodes: [...s.inviteCodes, invite] }));
  return ok(invite);
}

export async function registerDriverWithInvite(
  phone: string,
  dui: string,
  fullName: string,
  code: string
): Promise<ApiResponse<{ user: AuthUser; driver: DriverProfileRecord }>> {
  if (findUserByPhone(phone)) return fail('Este teléfono ya está registrado.');

  const invite = getStore().inviteCodes.find((c) => c.code === code.toUpperCase());
  if (!invite) return fail('Código de invitación inválido.');
  if (invite.usedBy) return fail('Este código ya fue utilizado.');

  const vehicle = getVehicle(invite.vehicleId);
  const owner = getStore().owners.find((o) => o.id === invite.ownerId);
  if (!vehicle || !owner) return fail('Unidad o dueño no encontrado.');
  if (owner.status !== 'approved') return fail('El dueño no está aprobado.');
  if (vehicle.status !== 'approved') return fail('La unidad no está aprobada.');

  const activeDriver = getStore().drivers.find(
    (d) => d.vehicleId === vehicle.vehicleId && d.status === 'approved'
  );
  if (activeDriver) return fail('Esta unidad ya tiene un conductor activo.');

  const user = createUser(phone, fullName, normalizeDui(dui), 'driver');
  const driverPublicId = generateDriverPublicId(getStore().drivers.length);
  const driver: DriverProfileRecord = {
    id: driverPublicId,
    userId: user.userId,
    ownerId: owner.id,
    vehicleId: vehicle.vehicleId,
    name: fullName,
    phone: normalizePhone(phone),
    status: 'approved',
    inviteCodeUsed: code.toUpperCase(),
    rating: 5.0,
    totalTrips: 0,
    createdAt: new Date().toISOString(),
  };

  const subscription = createDriverSubscription(driver.id);

  updateStore((s) => ({
    ...s,
    users: [...s.users, user],
    drivers: [...s.drivers, driver],
    subscriptions: [...s.subscriptions, subscription],
    currentUserId: user.userId,
    inviteCodes: s.inviteCodes.map((c) =>
      c.code === code.toUpperCase()
        ? { ...c, usedBy: driver.id, usedAt: new Date().toISOString() }
        : c
    ),
    vehicles: s.vehicles.map((v) =>
      v.vehicleId === vehicle.vehicleId ? { ...v, driverId: driver.id } : v
    ),
  }));

  await persistSession(user);
  return ok({ user, driver });
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
    password?: string;
  }
): Promise<ApiResponse<{ user: AuthUser; business: BusinessProfile }>> {
  if (findUserByPhone(phone)) return fail('Este teléfono ya está registrado.');
  const user = createUser(phone, fullName, normalizeDui(dui), 'business');
  const pwd = data.password ?? 'QaTest123';
  const business: BusinessProfile = {
    id: generateId('business'),
    userId: user.userId,
    businessName: data.businessName,
    businessType: data.businessType,
    responsibleDui: normalizeDui(dui),
    businessPhone: normalizePhone(data.businessPhone),
    nit: data.nit,
    coordinates: { latitude: data.latitude, longitude: data.longitude },
    addressLabel: data.addressLabel,
    status: 'approved',
    rating: 5,
    totalDeliveries: 0,
    createdAt: new Date().toISOString(),
  };
  updateStore((s) => ({
    ...s,
    users: [...s.users, user],
    businesses: [...s.businesses, business],
    currentUserId: user.userId,
    passwords: { ...(s.passwords ?? {}), [normalizePhone(phone)]: pwd },
  }));
  await persistSession(user);
  return ok({ user, business });
}

export async function updateUserProfilePhoto(
  userId: string,
  profilePhoto: string
): Promise<ApiResponse<AuthUser>> {
  let updated: AuthUser | undefined;
  updateStore((s) => {
    const users = s.users.map((u) => {
      if (u.userId !== userId) return u;
      updated = { ...u, profilePhoto, updatedAt: new Date().toISOString() };
      return updated;
    });
    return { ...s, users };
  });
  if (!updated) return fail('Usuario no encontrado');
  if (getCurrentUser()?.userId === userId) {
    await persistSession(updated);
  }
  return ok(updated);
}

export function saveCompletedDelivery(
  record: Omit<DeliveryHistoryRecord, 'id'>
): DeliveryHistoryRecord {
  return addDeliveryHistory(record);
}

export async function approveOwner(ownerId: string): Promise<ApiResponse<Owner>> {
  let updated: Owner | undefined;
  updateStore((s) => {
    const owners = s.owners.map((o) => {
      if (o.id !== ownerId) return o;
      updated = { ...o, status: 'approved' };
      return updated;
    });
    return { ...s, owners };
  });
  return updated ? ok(updated) : fail('Dueño no encontrado');
}

export async function rejectOwner(ownerId: string): Promise<ApiResponse<Owner>> {
  let updated: Owner | undefined;
  updateStore((s) => {
    const owners = s.owners.map((o) => {
      if (o.id !== ownerId) return o;
      updated = { ...o, status: 'rejected' };
      return updated;
    });
    return { ...s, owners };
  });
  return updated ? ok(updated) : fail('Dueño no encontrado');
}

export async function approveVehicle(vehicleId: string): Promise<ApiResponse<Vehicle>> {
  let updated: Vehicle | undefined;
  updateStore((s) => {
    const vehicles = s.vehicles.map((v) => {
      if (v.vehicleId !== vehicleId) return v;
      updated = { ...v, status: 'approved' };
      return updated;
    });
    return { ...s, vehicles };
  });
  return updated ? ok(updated) : fail('Vehículo no encontrado');
}

export async function rejectVehicle(vehicleId: string): Promise<ApiResponse<Vehicle>> {
  let updated: Vehicle | undefined;
  updateStore((s) => {
    const vehicles = s.vehicles.map((v) => {
      if (v.vehicleId !== vehicleId) return v;
      updated = { ...v, status: 'rejected' };
      return updated;
    });
    return { ...s, vehicles };
  });
  return updated ? ok(updated) : fail('Vehículo no encontrado');
}

export async function approveDriver(driverId: string): Promise<ApiResponse<DriverProfileRecord>> {
  let updated: DriverProfileRecord | undefined;
  updateStore((s) => {
    const drivers = s.drivers.map((d) => {
      if (d.id !== driverId) return d;
      updated = { ...d, status: 'approved' };
      return updated;
    });
    return { ...s, drivers };
  });
  return updated ? ok(updated) : fail('Conductor no encontrado');
}

export async function rejectDriver(driverId: string): Promise<ApiResponse<DriverProfileRecord>> {
  let updated: DriverProfileRecord | undefined;
  updateStore((s) => {
    const drivers = s.drivers.map((d) => {
      if (d.id !== driverId) return d;
      updated = { ...d, status: 'rejected' };
      return updated;
    });
    return { ...s, drivers };
  });
  return updated ? ok(updated) : fail('Conductor no encontrado');
}

export async function startDriverSession(
  driverId: string,
  vehicleId: string
): Promise<ApiResponse<DriverSession>> {
  const driver = getStore().drivers.find((d) => d.id === driverId);
  const vehicle = getVehicle(vehicleId);
  const owner = vehicle ? getStore().owners.find((o) => o.id === vehicle.ownerId) : undefined;

  if (!driver || driver.status !== 'approved') return fail('Conductor no aprobado.');
  if (!vehicle || vehicle.status !== 'approved') return fail('Unidad no aprobada.');
  if (!owner || owner.status !== 'approved') return fail('Dueño no aprobado.');
  if (!driver.inviteCodeUsed) return fail('Conductor no invitado.');

  const sub = getStore().subscriptions?.find((s) => s.driverId === driverId);
  const subGuard = canDriverOperateSubscription(sub);
  if (!subGuard.allowed) return fail(subGuard.reason ?? 'Suscripción no activa.');

  const active = getStore().sessions.find((s) => s.driverId === driverId && !s.disconnectedAt);
  if (active) return ok(active);

  const session: DriverSession = {
    sessionId: generateId('sess'),
    driverId,
    vehicleId,
    connectedAt: new Date().toISOString(),
    disconnectedAt: null,
    durationMinutes: null,
    totalTrips: 0,
    totalKm: 0,
    totalCashCollected: 0,
  };
  updateStore((s) => ({ ...s, sessions: [...s.sessions, session] }));
  return ok(session);
}

export async function endDriverSession(
  driverId: string,
  stats?: Partial<Pick<DriverSession, 'totalTrips' | 'totalKm' | 'totalCashCollected'>>
): Promise<ApiResponse<DriverSession>> {
  let updated: DriverSession | undefined;
  updateStore((s) => {
    const sessions = s.sessions.map((sess) => {
      if (sess.driverId !== driverId || sess.disconnectedAt) return sess;
      const disconnectedAt = new Date().toISOString();
      const durationMinutes = Math.round(
        (new Date(disconnectedAt).getTime() - new Date(sess.connectedAt).getTime()) / 60000
      );
      updated = {
        ...sess,
        disconnectedAt,
        durationMinutes,
        totalTrips: stats?.totalTrips ?? sess.totalTrips,
        totalKm: stats?.totalKm ?? sess.totalKm,
        totalCashCollected: stats?.totalCashCollected ?? sess.totalCashCollected,
      };
      return updated;
    });
    return { ...s, sessions };
  });
  return updated ? ok(updated) : fail('No hay sesión activa.');
}

export function saveCompletedTrip(record: Omit<TripHistoryRecord, 'id'>): TripHistoryRecord {
  return addTripHistory(record);
}

export function fetchTripHistory(filters?: {
  passengerId?: string;
  driverId?: string;
  ownerId?: string;
}): TripHistoryRecord[] {
  return getTripHistory(filters);
}

export function fetchDriverSessions(driverId: string): DriverSession[] {
  return getAllSessionsByDriver(driverId);
}

export function fetchDemandZones() {
  return getDemandZones();
}

export async function logout(): Promise<void> {
  await clearAuthSession();
}

export function setUserRole(userId: string, role: UserRole): AuthUser | null {
  let updated: AuthUser | undefined;
  updateStore((s) => {
    const users = s.users.map((u) => {
      if (u.userId !== userId) return u;
      updated = { ...u, role, updatedAt: new Date().toISOString() };
      return updated;
    });
    return { ...s, users, currentUserId: userId };
  });
  return updated ?? null;
}

export function getInvitePreview(code: string): {
  code: InviteCode;
  vehicle: Vehicle;
  owner: Owner;
} | null {
  const invite = getStore().inviteCodes.find((c) => c.code === code.toUpperCase());
  if (!invite || invite.usedBy) return null;
  const vehicle = getVehicle(invite.vehicleId);
  const owner = getStore().owners.find((o) => o.id === invite.ownerId);
  if (!vehicle || !owner) return null;
  return { code: invite, vehicle, owner };
}

export function resolveCurrentProfiles() {
  const user = getCurrentUser();
  if (!user) return { user: null, owner: null, driver: null };
  return {
    user,
    owner: getOwnerByUserId(user.userId) ?? null,
    driver: getDriverByUserId(user.userId) ?? null,
  };
}
