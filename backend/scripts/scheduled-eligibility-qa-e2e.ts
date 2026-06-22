#!/usr/bin/env tsx
/**
 * QA — scheduled trip eligibility + radius rules
 * Usage: npm run qa:scheduled-eligibility
 */
import {
  isSchedulableVehicleType,
  normalizeVehicleType,
} from '../src/services/providerEligibility.service';
import { driverInviteRegisterPayload, ownerRegisterPayload } from './qa-registration';
import { loginAsSuperAdmin } from './admin-qa-auth';

const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

const SAN_SALVADOR = { latitude: 13.6929, longitude: -89.2182 };
const AHUACHAPAN = { latitude: 13.9214, longitude: -89.845 };

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];
let qaPhoneSeq = 0;

function nextSalvadorPhone(prefix: '71' | '72'): string {
  qaPhoneSeq += 1;
  return `${prefix}${String(Date.now() + qaPhoneSeq).slice(-6)}`;
}

async function req(path: string, body?: unknown, token?: string, method?: string) {
  const httpMethod = method ?? (body !== undefined ? 'POST' : 'GET');
  const res = await fetch(`${API}${path}`, {
    method: httpMethod,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function loginAs(phone: string, dui: string): Promise<string> {
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const login = await req('/auth/login', { phone, dui, code: OTP });
  if (!login.json.ok) throw new Error(`Login failed (${phone}): ${login.json.error}`);
  return login.json.data.authToken as string;
}

async function registerOwnerVehicleDriver(
  vehicleType: string,
  label: string,
  location: { latitude: number; longitude: number }
) {
  const adminToken = await loginAsSuperAdmin();
  const ownerPhone = nextSalvadorPhone('71');
  await req('/auth/request-otp', { phone: ownerPhone });
  await req('/auth/verify-otp', { phone: ownerPhone, code: OTP });
  const ownerReg = await req(
    '/owners/register',
    ownerRegisterPayload(
      ownerPhone,
      `${Math.floor(Math.random() * 89999999 + 10000000)}-${Math.floor(Math.random() * 9)}`,
      'QA',
      `Owner ${label}`
    )
  );
  if (!ownerReg.json.ok) {
    throw new Error(`Owner registration failed (${label}): ${ownerReg.json.error}`);
  }
  const ownerToken = ownerReg.json.data?.authToken as string;
  const ownerId = ownerReg.json.data?.owner?.id as string;

  const vehicleReg = await req(
    '/vehicles/register',
    {
      unitNumber: String(Math.floor(Math.random() * 900) + 100),
      plateNumber: `Q${Date.now().toString().slice(-5)}${label.charCodeAt(0)}`,
      associationName: 'QA',
      vehicleType,
    },
    ownerToken
  );
  if (!vehicleReg.json.ok) {
    throw new Error(`Vehicle registration failed (${label}): ${vehicleReg.json.error}`);
  }
  const vehicleId = vehicleReg.json.data?.vehicleId as string;

  await req(`/vehicles/${vehicleId}/upload-documents`, { registrationCardImage: 'https://example.com/doc.jpg' }, ownerToken);
  await req(`/vehicles/${vehicleId}/submit-verification`, {}, ownerToken);
  await req('/owners/upload-documents', { duiFront: 'https://example.com/dui.jpg' }, ownerToken);
  await req('/owners/submit-verification', {}, ownerToken);
  await req(`/admin/owners/${ownerId}/approve`, {}, adminToken);
  await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);

  const invite = await req(`/vehicles/${vehicleId}/invite-driver`, {}, ownerToken);
  const inviteCode = invite.json.data?.code as string;

  const driverPhone = nextSalvadorPhone('72');
  await req('/auth/request-otp', { phone: driverPhone });
  await req('/auth/verify-otp', { phone: driverPhone, code: OTP });
  const driverReg = await req(
    '/drivers/register-with-invite',
    driverInviteRegisterPayload(driverPhone, inviteCode, 'QA', `Driver ${label}`)
  );
  if (!driverReg.json.ok) {
    throw new Error(`Driver registration failed (${label}): ${driverReg.json.error}`);
  }
  const driverId = driverReg.json.data?.driver?.id as string;
  const driverToken = driverReg.json.data?.authToken as string;
  await req(`/admin/drivers/${driverId}/approve`, {}, adminToken);

  const session = await req(
    `/drivers/${driverId}/sessions/start`,
    { vehicleId, latitude: location.latitude, longitude: location.longitude },
    driverToken
  );
  if (!session.json.ok) {
    throw new Error(`Driver session failed (${label}): ${session.json.error}`);
  }

  return { driverId, driverToken, vehicleType };
}

async function run() {
  console.log('MOVI Scheduled Eligibility QA —', API, '\n');

  record('Microbús admite programar', isSchedulableVehicleType('microbus'));
  record('Pickup admite programar', isSchedulableVehicleType('pickup'));
  record('Camión admite programar', isSchedulableVehicleType('camion'));
  record('Mototaxi NO admite programar', !isSchedulableVehicleType('mototaxi'));
  record('Motocicleta NO admite programar', !isSchedulableVehicleType('motocicleta'));
  record('Sedán NO admite programar', !isSchedulableVehicleType('sedan'));

  const passengerToken = await loginAs('78214898', '71542253-8');

  const nearDriver = await registerOwnerVehicleDriver('mototaxi', 'Near', SAN_SALVADOR);
  const farDriver = await registerOwnerVehicleDriver('mototaxi', 'Far', AHUACHAPAN);
  const microbusDriver = await registerOwnerVehicleDriver('microbus', 'Bus', AHUACHAPAN);

  const nowTrip = await req(
    '/trips/request',
    {
      origin: { id: 'o', name: 'San Salvador', coordinates: SAN_SALVADOR },
      destination: { id: 'd', name: 'Centro', coordinates: { latitude: 13.701, longitude: -89.224 } },
      tripType: 'private',
      description: 'QA inmediato San Salvador',
      requiredVehicleType: 'mototaxi',
      requestMode: 'NOW',
    },
    passengerToken
  );
  const nowTripId = nowTrip.json.data?.id as string;
  record('Solicitud inmediata creada', nowTrip.json.ok === true, nowTrip.json.error);

  const nearAvailable = await req('/trips/available', undefined, nearDriver.driverToken);
  const farAvailable = await req('/trips/available', undefined, farDriver.driverToken);
  const nearSees = (nearAvailable.json.data?.trips ?? []).some((t: { id: string }) => t.id === nowTripId);
  const farSees = (farAvailable.json.data?.trips ?? []).some((t: { id: string }) => t.id === nowTripId);
  record('Proveedor cercano ve solicitud inmediata', nearSees);
  record('Proveedor Ahuachapán NO ve solicitud inmediata', !farSees);

  const farOffer = await req(`/trips/${nowTripId}/offers`, { price: 4, etaMinutes: 20 }, farDriver.driverToken);
  record(
    'Backend rechaza oferta fuera de radio',
    farOffer.json.ok === false &&
      String(farOffer.json.error ?? '').includes('fuera del radio permitido'),
    farOffer.json.error
  );

  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const scheduledTrip = await req(
    '/trips/request',
    {
      origin: { id: 'o2', name: 'San Salvador', coordinates: SAN_SALVADOR },
      destination: { id: 'd2', name: 'Aeropuerto', coordinates: { latitude: 13.4409, longitude: -89.0557 } },
      tripType: 'private',
      description: 'Viaje grupal programado',
      requiredVehicleType: 'microbus',
      requestMode: 'SCHEDULED',
      scheduledAt,
    },
    passengerToken
  );
  const scheduledTripId = scheduledTrip.json.data?.id as string;
  record('Solicitud programada microbús creada', scheduledTrip.json.ok === true, scheduledTrip.json.error);

  const scheduledList = await req('/trips/available/scheduled', undefined, microbusDriver.driverToken);
  const busSeesScheduled = (scheduledList.json.data?.trips ?? []).some(
    (t: { id: string }) => t.id === scheduledTripId
  );
  record('Microbús fuera de zona puede ver programada', busSeesScheduled);

  const scheduledOffer = await req(
    `/trips/${scheduledTripId}/offers`,
    { price: 25, etaMinutes: 45 },
    microbusDriver.driverToken
  );
  const scheduledOfferId = scheduledOffer.json.data?.offer?.id as string;
  record('Oferta anticipada en programada', scheduledOffer.json.ok === true, scheduledOffer.json.error);

  const acceptScheduled = await req(
    `/trips/${scheduledTripId}/offers/${scheduledOfferId}/accept`,
    {},
    passengerToken
  );
  record('Aceptación de oferta programada', acceptScheduled.json.ok === true, acceptScheduled.json.error);

  const afterAccept = await req('/trips/available/scheduled', undefined, microbusDriver.driverToken);
  const stillVisible = (afterAccept.json.data?.trips ?? []).some(
    (t: { id: string }) => t.id === scheduledTripId
  );
  record('Programada desaparece para otros tras confirmar', !stillVisible);

  const reservations = await req('/trips/reservations', undefined, microbusDriver.driverToken);
  const inReservations = (reservations.json.data?.trips ?? []).some(
    (t: { id: string }) => t.id === scheduledTripId
  );
  record('Proveedor ganador la ve en reservas', inReservations);

  const invalidScheduled = await req(
    '/trips/request',
    {
      origin: { id: 'o3', name: 'San Salvador', coordinates: SAN_SALVADOR },
      destination: { id: 'd3', name: 'Centro', coordinates: { latitude: 13.701, longitude: -89.224 } },
      tripType: 'private',
      description: 'No debe programar',
      requiredVehicleType: 'mototaxi',
      requestMode: 'SCHEDULED',
      scheduledAt,
    },
    passengerToken
  );
  record(
    'Mototaxi rechazado en programada',
    invalidScheduled.json.ok === false,
    invalidScheduled.json.error
  );

  console.log('\n=== RESUMEN SCHEDULED ELIGIBILITY QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
