import AsyncStorage from '@react-native-async-storage/async-storage';
import { salvadorPlaces } from '../data/mock';
import { loadDemoManifest } from '../data/demoCredentials';
import { DEMO_OTP_CODE } from './otpService';
import * as mockApi from './mockApi';
import * as authService from './authService';
import {
  clearPermissionsAccepted,
  hasPermissionsAccepted,
  markPermissionsAccepted,
} from './permissionsFlowService';
import { getSimulationMeta } from './mockStore';
import {
  findUserByPhoneAndDui,
  getDriverByUserId,
  getOwnerByUserId,
  getStore,
  getTripHistory,
  getVehicle,
  resetStoreToSeed,
  setCurrentUser,
} from './mockStore';
import { AuthUser, UserRole } from '../types/models';
import { duiFormatVariants, normalizeDuiDigits } from '../utils/platform';
import {
  TAGLINE_PRIMARY,
  TAGLINE_SECONDARY,
  TAGLINE_DRIVER,
  SUBSCRIPTION_PRICE_USD,
} from '../theme/brand';
import { VEHICLE_TYPE_OPTIONS } from '../utils/vehicleTypes';
import { createTripRequest } from '../data/mock';
import {
  clearDemoChats,
  getChatMessages,
  seedChatIfEmpty,
  seedDemoChatMessages,
} from './chatService';
import { getVehicleTypeKpis } from './analyticsService';
import {
  filterDemandZones,
  enrichDemandZones,
  HOTSPOT_VEHICLE_OPTIONS,
  HOTSPOT_SERVICE_OPTIONS,
} from '../utils/hotspotFilters';
import { SUBSCRIPTION_MONTHLY_USD, canDriverOperateSubscription } from './subscriptionService';

export type QaStepResult = {
  id: string;
  label: string;
  ok: boolean;
  message: string;
  durationMs: number;
};

export type QaRunResult = {
  startedAt: string;
  finishedAt: string;
  steps: QaStepResult[];
  passed: number;
  failed: number;
};

type StepFn = () => Promise<string>;

let lastResult: QaRunResult | null = null;
let running = false;

export function getLastQaResult(): QaRunResult | null {
  return lastResult;
}

export function isQaRunning(): boolean {
  return running;
}

function demoUser(role: UserRole, index = 0): AuthUser {
  const users = getStore().users.filter((u) => u.role === role);
  const user = users[index];
  if (!user) throw new Error(`Usuario demo ${role}[${index}] no encontrado en el store`);
  return user;
}

function primaryDriver() {
  const driver = getStore().drivers.find((d) => d.id === 'MOVI-DRV-000001') ?? getStore().drivers[0];
  if (!driver) throw new Error('Conductor demo no encontrado en el store');
  return driver;
}

/** Conductor con unidad, dueño y suscripción válidos (puede conectarse en app). */
function operableDriverUser(): AuthUser {
  const store = getStore();
  const driver = store.drivers.find((d) => {
    if (d.status !== 'approved' || !d.inviteCodeUsed) return false;
    const vehicle = store.vehicles.find((v) => v.vehicleId === d.vehicleId);
    const owner = vehicle ? store.owners.find((o) => o.id === vehicle.ownerId) : undefined;
    if (vehicle?.status !== 'approved' || owner?.status !== 'approved') return false;
    const sub = store.subscriptions.find((s) => s.driverId === d.id);
    return canDriverOperateSubscription(sub).allowed;
  });
  if (!driver) throw new Error('Conductor operable no encontrado en el store');
  const user = store.users.find((u) => u.userId === driver.userId);
  if (!user) throw new Error('Usuario del conductor operable no encontrado');
  return user;
}

async function runStep(id: string, label: string, fn: StepFn): Promise<QaStepResult> {
  const start = Date.now();
  try {
    const message = await fn();
    return { id, label, ok: true, message, durationMs: Date.now() - start };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Error desconocido';
    return { id, label, ok: false, message, durationMs: Date.now() - start };
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

/** Rutas Expo Router conocidas — mantener alineadas con `app/`. */
function getRegisteredExpoRoutes(): string[] {
  return [
    '/',
    '/auth/otp',
    '/auth/select-role',
    '/auth/register-identity',
    '/passenger',
    '/passenger/destination',
    '/passenger/estimate',
    '/passenger/matching',
    '/passenger/offers',
    '/driver',
    '/owner/dashboard',
    '/admin',
    '/business/dashboard',
    '/business/invoices',
    '/driver/subscription',
    '/dev/qa',
  ];
}

async function loginAs(phone: string, dui: string) {
  await mockApi.requestOtp(phone);
  const res = await mockApi.loginWithOtp(phone, dui, DEMO_OTP_CODE);
  assert(res.ok && !!res.data, res.error ?? 'Login falló');
  return res.data!;
}

/** Ejecuta flujos end-to-end contra el mock store (solo __DEV__). */
export async function runFullQaSuite(onProgress?: (step: QaStepResult) => void): Promise<QaRunResult> {
  if (!__DEV__) {
    throw new Error('QA automático solo está disponible en modo desarrollo.');
  }
  if (running) {
    throw new Error('Ya hay una ejecución QA en curso.');
  }

  running = true;
  const startedAt = new Date().toISOString();
  const steps: QaStepResult[] = [];

  const track = async (id: string, label: string, fn: StepFn) => {
    const result = await runStep(id, label, fn);
    steps.push(result);
    onProgress?.(result);
    return result;
  };

  const qaPhone = (suffix: string) => `7999${suffix}`;
  const qaDui = (suffix: string) => `0999999${suffix}-9`;

  try {
    await track('reset', 'Reiniciar store y sesión', async () => {
      await authService.logout();
      await resetStoreToSeed();
      await loadDemoManifest();
      await AsyncStorage.multiRemove([
        authService.SESSION_KEYS.currentUser,
        authService.SESSION_KEYS.authToken,
        authService.SESSION_KEYS.role,
        authService.SESSION_KEYS.phoneNumber,
      ]);
      return 'Store y AsyncStorage limpiados';
    });

    await track('demo-simulation', 'Simulación demo producción', async () => {
      const meta = getSimulationMeta();
      assert(!!meta, 'simulationMeta no generado');
      assert(meta!.totalPassengers >= 500, 'Pasajeros demo insuficientes');
      assert(meta!.totalDrivers >= 300, 'Conductores demo insuficientes');
      assert(meta!.totalTrips >= 25000, 'Viajes meta incorrectos');
      assert(meta!.totalDeliveries >= 15000, 'Entregas meta incorrectos');
      assert(meta!.mrr === 2100, 'MRR demo incorrecto');
      const store = getStore();
      assert(store.tripHistory.length >= 500, 'Historial de viajes vacío');
      assert(store.deliveryHistory.length >= 200, 'Historial de entregas vacío');
      assert(store.demandZones.length >= 5, 'Hotspots insuficientes');
      return `${meta!.totalPassengers} pasajeros · ${meta!.totalTrips} viajes · MRR $${meta!.mrr}`;
    });

    const passengerDemo = demoUser('passenger', 0);
    const driverDemo = demoUser('driver', 0);
    const operableDriver = operableDriverUser();
    const adminDemo = demoUser('admin', 0);
    const ownerDemo = demoUser('owner', 0);
    const businessDemo = demoUser('business', 0);
    const manifest = await loadDemoManifest();
    const openUnit = manifest?.openVehicleUnitNumber ?? '028';
    let qaInviteCode: string | undefined;

    await track('nav-register-flow', 'Navegación registro → permisos → OTP (sin loop)', async () => {
      await clearPermissionsAccepted('passenger_register');
      assert(
        !(await hasPermissionsAccepted('passenger_register')),
        'Permisos no deben estar marcados al inicio'
      );

      await markPermissionsAccepted('passenger_register');
      assert(
        await hasPermissionsAccepted('passenger_register'),
        'Permisos deben quedar aceptados'
      );
      assert(
        !(await hasPermissionsAccepted('owner_register')),
        'Flujos de permisos deben ser independientes por rol'
      );

      const phone = qaPhone('88');
      const dui = qaDui('8');
      await mockApi.requestOtp(phone);
      const verify = await mockApi.verifyOtp(phone, DEMO_OTP_CODE);
      assert(verify.ok && verify.data?.isNewUser === true, 'OTP debe marcar usuario nuevo');

      const reg = await mockApi.registerPassenger(phone, dui, 'QA Nav Pasajero');
      assert(reg.ok && reg.data?.role === 'passenger', 'Registro tras OTP falló');

      const again = await hasPermissionsAccepted('passenger_register');
      assert(again, 'Permisos siguen aceptados — no debe re-pedir en loop');

      return 'Registro → permisos → OTP → cuenta OK';
    });

    await track('otp', 'Solicitar OTP', async () => {
      const res = await mockApi.requestOtp(passengerDemo.phoneNumber);
      assert(res.ok, res.error ?? 'OTP request falló');
      return 'OTP enviado';
    });

    await track('login-passenger', 'Login pasajero demo', async () => {
      const user = await loginAs(passengerDemo.phoneNumber, passengerDemo.duiNumber);
      assert(user.role === 'passenger', 'Rol incorrecto');
      return `Sesión: ${user.fullName}`;
    });

    await track('login-dui-formats-passenger', 'Login pasajero: variantes formato DUI', async () => {
      for (const variant of duiFormatVariants(passengerDemo.duiNumber)) {
        await authService.logout();
        setCurrentUser(null);
        const user = await loginAs(passengerDemo.phoneNumber, variant);
        assert(user.role === 'passenger', `Fallo con DUI "${variant}"`);
      }
      return `${duiFormatVariants(passengerDemo.duiNumber).length} formatos pasajero OK`;
    });

    await track('login-dui-formats-roles', 'Login roles con DUI solo dígitos (iOS)', async () => {
      const cases: { label: string; user: AuthUser }[] = [
        { label: 'passenger', user: passengerDemo },
        { label: 'driver', user: driverDemo },
        { label: 'owner', user: ownerDemo },
        { label: 'business', user: businessDemo },
        { label: 'admin', user: adminDemo },
      ];
      for (const { label, user } of cases) {
        await authService.logout();
        setCurrentUser(null);
        const digitsOnly = normalizeDuiDigits(user.duiNumber);
        const logged = await loginAs(user.phoneNumber, digitsOnly);
        assert(logged.role === label, `Rol ${label} falló con DUI ${digitsOnly}`);
      }
      return '5 roles con DUI numérico OK';
    });

    await track('register-dui-formats', 'Registro dueño/negocio con DUI numérico', async () => {
      const ownerPhone = qaPhone('21');
      const ownerDuiDigits = '099988877';
      const ownerReg = await mockApi.registerOwner(ownerPhone, 'QA Dueño Formato', ownerDuiDigits);
      assert(ownerReg.ok, ownerReg.error ?? 'Registro dueño numérico falló');
      assert(
        normalizeDuiDigits(ownerReg.data!.owner.dui) === ownerDuiDigits,
        'DUI dueño no normalizado en store'
      );

      const businessPhone = qaPhone('22');
      const businessDuiDigits = '088877766';
      const businessReg = await mockApi.registerBusiness(
        businessPhone,
        'QA Negocio Formato',
        businessDuiDigits,
        {
          businessName: 'QA Negocio Formato',
          businessType: 'store',
          businessPhone,
          nit: '0614-000000-001-0',
          latitude: 13.69,
          longitude: -89.21,
          addressLabel: 'San Salvador',
        }
      );
      assert(businessReg.ok, businessReg.error ?? 'Registro negocio numérico falló');
      assert(
        normalizeDuiDigits(businessReg.data!.business.responsibleDui) === businessDuiDigits,
        'DUI negocio no normalizado en store'
      );

      return 'Dueño y negocio registrados con DUI sin guion';
    });

    await track('register-passenger', 'Registro pasajero nuevo', async () => {
      const phone = qaPhone('01');
      const dui = qaDui('1');
      const res = await mockApi.registerPassenger(phone, dui, 'QA Pasajero');
      assert(res.ok, res.error ?? 'Registro pasajero falló');
      return res.data!.fullName;
    });

    await track('trip-request', 'Solicitud de viaje (API)', async () => {
      const passenger = findUserByPhoneAndDui(qaPhone('01'), qaDui('1'));
      assert(!!passenger, 'Pasajero QA no encontrado');
      setCurrentUser(passenger!.userId);
      const origin = salvadorPlaces[0];
      const dest = salvadorPlaces[1];
      assert(!!origin && !!dest, 'Lugares demo no disponibles');
      return `${origin.name} → ${dest.name}`;
    });

    await track('driver-session', 'Conductor conectarse / desconectarse', async () => {
      await loginAs(operableDriver.phoneNumber, operableDriver.duiNumber);
      const driver = getDriverByUserId(operableDriver.userId);
      assert(!!driver, 'Conductor demo no encontrado');
      const connect = await mockApi.startDriverSession(driver!.id, driver!.vehicleId);
      assert(connect.ok, connect.error ?? 'Conexión falló');
      const disconnect = await mockApi.endDriverSession(driver!.id);
      assert(disconnect.ok, disconnect.error ?? 'Desconexión falló');
      return 'Sesión conductor OK';
    });

    await track('trip-history', 'Historial de viajes', async () => {
      const driver = primaryDriver();
      const record = mockApi.saveCompletedTrip({
        tripId: `qa-trip-${Date.now()}`,
        passengerId: passengerDemo.userId,
        passengerName: passengerDemo.fullName,
        driverId: driver.id,
        driverName: driver.name,
        originName: salvadorPlaces[0].name,
        destinationName: salvadorPlaces[1].name,
        distanceKm: 3.2,
        price: 2.5,
        durationMinutes: 12,
        status: 'trip_completed',
        completedAt: new Date().toISOString(),
      });
      const history = getTripHistory({ passengerId: passengerDemo.userId });
      assert(history.some((h) => h.id === record.id), 'Historial no guardado');
      return `${history.length} viaje(s) en historial`;
    });

    await track('register-owner', 'Registro dueño', async () => {
      const phone = qaPhone('02');
      const dui = qaDui('2');
      const res = await mockApi.registerOwner(phone, 'QA Dueño', dui);
      assert(res.ok, res.error ?? 'Registro dueño falló');
      const docs = await mockApi.uploadOwnerDocuments(res.data!.owner.id, {
        duiFront: 'mock://qa-dui-front',
        duiBack: 'mock://qa-dui-back',
        selfie: 'mock://qa-selfie',
        license: 'mock://qa-license',
        registrationCard: 'mock://qa-registration-card',
      });
      assert(docs.ok, docs.error ?? 'Docs dueño fallaron');
      const submit = await mockApi.submitOwnerVerification(res.data!.owner.id);
      assert(submit.ok, submit.error ?? 'Verificación dueño falló');
      return `Dueño ${res.data!.owner.id} en revisión`;
    });

    await track('register-vehicle', 'Registro y verificación de unidad', async () => {
      const owner = getStore().owners.find((o) => o.name === 'QA Dueño');
      assert(!!owner, 'Dueño QA no encontrado');
      const reg = await mockApi.registerVehicle(owner!.id, {
        unitNumber: '099',
        plateNumber: `QA-${Date.now().toString().slice(-4)}`,
        associationName: 'Asociación Centro',
        registrationName: 'QA Dueño',
        vehicleType: 'tuk_tuk_red',
      });
      assert(reg.ok, reg.error ?? 'Registro vehículo falló');
      await mockApi.uploadVehicleDocuments(reg.data!.vehicleId, {
        registrationCardImage: 'mock://reg',
        permitImage: 'mock://permit',
      });
      const submit = await mockApi.submitVehicleVerification(reg.data!.vehicleId);
      assert(submit.ok, submit.error ?? 'Verificación vehículo falló');
      return reg.data!.unitId;
    });

    await track('admin-approve', 'Admin: aprobar dueños y vehículos', async () => {
      await loginAs(adminDemo.phoneNumber, adminDemo.duiNumber);
      const owner = getStore().owners.find((o) => o.name === 'QA Dueño');
      assert(!!owner, 'Dueño pendiente no encontrado');
      const approveOwner = await mockApi.approveOwner(owner!.id);
      assert(approveOwner.ok, approveOwner.error ?? 'Aprobar dueño falló');
      const pendingVehicle = getStore().vehicles.find(
        (v) => v.ownerId === owner!.id && v.status === 'under_review'
      );
      assert(!!pendingVehicle, 'Vehículo pendiente no encontrado');
      const approveVehicle = await mockApi.approveVehicle(pendingVehicle!.vehicleId);
      assert(approveVehicle.ok, approveVehicle.error ?? 'Aprobar vehículo falló');
      return 'Dueño y vehículo aprobados';
    });

    await track('invite-driver', 'Invitar conductor', async () => {
      await loginAs(ownerDemo.phoneNumber, ownerDemo.duiNumber);
      const openVehicle = getStore().vehicles.find((v) => v.unitNumber === openUnit);
      assert(!!openVehicle, 'Unidad abierta demo no encontrada');
      const invite = await mockApi.inviteDriver(openVehicle!.vehicleId);
      assert(invite.ok, invite.error ?? 'Invitación falló');
      qaInviteCode = invite.data!.code;
      return `Código: ${qaInviteCode}`;
    });

    await track('register-driver', 'Registro conductor con invitación', async () => {
      const phone = qaPhone('03');
      const dui = qaDui('3');
      assert(!!qaInviteCode, 'Código de invitación QA no generado');
      const res = await mockApi.registerDriverWithInvite(
        phone,
        dui,
        'QA Conductor',
        qaInviteCode!
      );
      assert(res.ok, res.error ?? 'Registro conductor falló');
      return res.data!.driver.name;
    });

    await track('owner-dashboard', 'Dashboard dueño demo', async () => {
      await loginAs(ownerDemo.phoneNumber, ownerDemo.duiNumber);
      const owner = getOwnerByUserId(ownerDemo.userId);
      assert(!!owner && owner.status === 'approved', 'Dueño demo no aprobado');
      const vehicles = getStore().vehicles.filter((v) => v.ownerId === owner!.id);
      return `${vehicles.length} unidad(es)`;
    });

    await track('driver-offer', 'Conductor: conectar y oferta', async () => {
      await loginAs(operableDriver.phoneNumber, operableDriver.duiNumber);
      const driver = getDriverByUserId(operableDriver.userId);
      assert(!!driver, 'Conductor no encontrado');
      const vehicle = getVehicle(driver!.vehicleId);
      assert(!!vehicle, 'Vehículo no encontrado');
      const session = await mockApi.startDriverSession(driver!.id, vehicle!.vehicleId);
      assert(session.ok, session.error ?? 'No pudo conectar');
      return 'Conductor online';
    });

    await track('login-business', 'Login negocio demo', async () => {
      const user = await loginAs(businessDemo.phoneNumber, businessDemo.duiNumber);
      assert(user.role === 'business', 'Rol negocio incorrecto');
      return user.fullName;
    });

    await track('subscription', 'Suscripción conductor demo', async () => {
      await loginAs(operableDriver.phoneNumber, operableDriver.duiNumber);
      const driver = getDriverByUserId(operableDriver.userId);
      const sub = getStore().subscriptions.find((s) => s.driverId === driver!.id);
      assert(!!sub, 'Suscripción no encontrada');
      return sub!.status;
    });

    await track('brand-taglines', 'Marca: taglines oficiales (brand.ts)', async () => {
      assert(TAGLINE_PRIMARY.includes('MOVI'), 'TAGLINE_PRIMARY debe mencionar MOVI');
      assert(TAGLINE_SECONDARY.length > 10, 'TAGLINE_SECONDARY vacío o muy corto');
      assert(TAGLINE_DRIVER.includes('100%'), 'TAGLINE_DRIVER debe mencionar 100% ganancias');
      return 'TAGLINE_PRIMARY · TAGLINE_SECONDARY · TAGLINE_DRIVER OK';
    });

    await track('vehicle-types', 'Tipos de vehículo (8 en models.ts)', async () => {
      assert(VEHICLE_TYPE_OPTIONS.length === 8, `Esperados 8 tipos, hay ${VEHICLE_TYPE_OPTIONS.length}`);
      const expected = [
        'mototaxi',
        'qute',
        'motocicleta',
        'sedan',
        'camioneta',
        'pickup',
        'camion',
        'microbus',
      ];
      for (const type of expected) {
        assert(VEHICLE_TYPE_OPTIONS.includes(type as (typeof VEHICLE_TYPE_OPTIONS)[number]), `Falta tipo ${type}`);
      }
      return VEHICLE_TYPE_OPTIONS.join(', ');
    });

    await track('trip-request-fields', 'TripRequest: passengerCount y description obligatorios', async () => {
      const origin = salvadorPlaces[0];
      const dest = salvadorPlaces[1];
      assert(!!origin && !!dest, 'Lugares demo no disponibles');
      const trip = createTripRequest(origin, dest, 'shared', 'qa-pax', 'QA Pax', {
        passengerCount: 4,
        description: 'Viaje grupal con equipaje',
      });
      assert(trip.passengerCount === 4, 'passengerCount no persistió');
      assert(trip.description === 'Viaje grupal con equipaje', 'description no persistió');
      const defaults = createTripRequest(origin, dest, 'shared');
      assert(defaults.passengerCount >= 1, 'passengerCount default inválido');
      assert(!!defaults.description?.trim(), 'description default vacía');
      return `passengerCount=${trip.passengerCount} · description OK`;
    });

    await track('chat-service', 'Chat service existe y seed funciona', async () => {
      clearDemoChats();
      seedChatIfEmpty('qa-chat-trip');
      const seeded = getChatMessages('qa-chat-trip');
      assert(seeded.length >= 1, 'seedChatIfEmpty no generó mensajes');
      seedDemoChatMessages(['qa-chat-a', 'qa-chat-b'], ['qa-del-a'], () => 0.42);
      const tripMsgs = getChatMessages('qa-chat-a');
      const delMsgs = getChatMessages('qa-del-a');
      assert(tripMsgs.length >= 2, 'seedDemoChatMessages: viaje sin mensajes');
      assert(delMsgs.length >= 2, 'seedDemoChatMessages: entrega sin mensajes');
      return `${seeded.length + tripMsgs.length + delMsgs.length} mensajes seed`;
    });

    await track('business-invoices-route', 'Ruta facturas negocio (/business/invoices)', async () => {
      const route = '/business/invoices';
      const registeredRoutes = getRegisteredExpoRoutes();
      assert(registeredRoutes.includes(route), `Ruta ${route} no registrada`);
      return route;
    });

    await track('vehicle-type-kpis', 'Admin: KPIs por tipo de vehículo', async () => {
      const kpis = getVehicleTypeKpis();
      assert(kpis.length > 0, 'getVehicleTypeKpis devolvió vacío');
      const withData = kpis.filter((k) => k.trips > 0 || k.vehicles > 0);
      assert(withData.length > 0, 'KPIs sin datos de viajes o vehículos');
      const top = kpis[0];
      return `${kpis.length} tipos · top: ${top.label} (${top.trips} viajes)`;
    });

    await track('hotspot-filters', 'Utilidad filtros de hotspots', async () => {
      assert(HOTSPOT_SERVICE_OPTIONS.length >= 4, 'Opciones de servicio insuficientes');
      assert(HOTSPOT_VEHICLE_OPTIONS.length >= 9, 'Opciones de vehículo insuficientes');
      const store = getStore();
      const enriched = enrichDemandZones(store.demandZones);
      const filtered = filterDemandZones(enriched, { service: 'viaje', vehicleType: 'mototaxi' });
      assert(enriched.length === store.demandZones.length, 'enrichDemandZones alteró conteo');
      assert(filtered.length <= enriched.length, 'filterDemandZones devolvió más zonas');
      return `${filtered.length}/${enriched.length} hotspots (viaje · mototaxi)`;
    });

    await track('register-identity-route', 'Ruta registro identidad (/auth/register-identity)', async () => {
      const route = '/auth/register-identity';
      const registeredRoutes = getRegisteredExpoRoutes();
      assert(registeredRoutes.includes(route), `Ruta ${route} no registrada`);
      return route;
    });

    await track('subscription-price', 'Suscripción: constante $7 USD', async () => {
      assert(SUBSCRIPTION_MONTHLY_USD === 7, `SUBSCRIPTION_MONTHLY_USD=${SUBSCRIPTION_MONTHLY_USD}`);
      assert(SUBSCRIPTION_PRICE_USD === 7, `SUBSCRIPTION_PRICE_USD=${SUBSCRIPTION_PRICE_USD}`);
      const driver = getDriverByUserId(operableDriver.userId);
      const sub = getStore().subscriptions.find((s) => s.driverId === driver!.id);
      assert(sub?.monthlyAmountUsd === 7, `Suscripción demo: $${sub?.monthlyAmountUsd}`);
      return '$7/mes en brand.ts y subscriptionService';
    });

    await track('routes', 'Rutas Expo Router registradas', async () => {
      const routes = getRegisteredExpoRoutes();
      return `${routes.length} rutas verificadas`;
    });
  } finally {
    running = false;
  }

  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  lastResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    steps,
    passed,
    failed,
  };
  return lastResult;
}
