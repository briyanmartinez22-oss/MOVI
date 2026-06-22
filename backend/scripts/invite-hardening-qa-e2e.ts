#!/usr/bin/env tsx
/**
 * QA — hardened vehicle invite validation codes
 */
import { PrismaClient } from '@prisma/client';
import { loginAsSuperAdmin } from './admin-qa-auth';
import { driverInviteRegisterPayload, ownerRegisterPayload } from './qa-registration';

const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';
const prisma = new PrismaClient();

type Step = { name: string; ok: boolean; detail?: string };
const results: Step[] = [];

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

function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(ok ? `✓ ${name}` : `✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function validateCode(code: string) {
  return req('/drivers/invites/validate', { code });
}

async function bootstrapApprovedVehicle(adminToken: string) {
  const ts = Date.now();
  const ownerPhone = `81${String(ts).slice(-6)}`;
  await req('/auth/request-otp', { phone: ownerPhone });
  await req('/auth/verify-otp', { phone: ownerPhone, code: OTP });
  const ownerReg = await req(
    '/owners/register',
    ownerRegisterPayload(ownerPhone, `${String(ts).slice(-8)}-1`, 'QA', 'Invite Owner')
  );
  const ownerToken = ownerReg.json.data?.authToken as string;
  const ownerId = ownerReg.json.data?.owner?.id as string;
  const vehicleReg = await req(
    '/vehicles/register',
    {
      unitNumber: '811',
      plateNumber: `I${String(ts).slice(-5)}`,
      associationName: 'QA Invite',
      vehicleType: 'mototaxi',
    },
    ownerToken
  );
  const vehicleId = vehicleReg.json.data?.vehicleId as string;
  await req(`/vehicles/${vehicleId}/submit-verification`, {}, ownerToken);
  await req('/owners/submit-verification', {}, ownerToken);
  await req(`/admin/owners/${ownerId}/approve`, {}, adminToken);
  await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);
  const invite = await req(`/vehicles/${vehicleId}/invite-driver`, {}, ownerToken);
  const code = (invite.json.data?.code ?? invite.json.data?.inviteCode) as string;
  if (!invite.json.ok || !code) {
    throw new Error(`Invite bootstrap failed: ${invite.json.error ?? 'missing code'}`);
  }
  return {
    ownerId,
    ownerToken,
    vehicleId,
    code,
  };
}

async function run() {
  console.log('MOVI Invite Hardening QA —', API, '\n');
  const adminToken = await loginAsSuperAdmin();

  const invalid = await validateCode('INVALID-CODE');
  record(
    'INVITE_INVALID on unknown code',
    invalid.json.ok === false && invalid.json.code === 'INVITE_INVALID',
    invalid.json.code
  );

  const bundleA = await bootstrapApprovedVehicle(adminToken);
  const driverPhone = `82${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: driverPhone });
  await req('/auth/verify-otp', { phone: driverPhone, code: OTP });
  const driverReg = await req(
    '/drivers/register-with-invite',
    driverInviteRegisterPayload(driverPhone, bundleA.code, 'QA', 'Invite Driver')
  );
  record('Register driver consumes invite', driverReg.json.ok === true, driverReg.json.error);

  const used = await validateCode(bundleA.code);
  record(
    'INVITE_USED after registration',
    used.json.ok === false && used.json.code === 'INVITE_USED',
    used.json.code
  );

  const bundleB = await bootstrapApprovedVehicle(adminToken);
  const inviteBeforeSuspend = await req(`/vehicles/${bundleB.vehicleId}/invite-driver`, {}, bundleB.ownerToken);
  const codeB = inviteBeforeSuspend.json.data?.code as string;
  await req(`/admin/owners/${bundleB.ownerId}/suspend`, {}, adminToken);
  const ownerSuspended = await validateCode(codeB);
  record(
    'OWNER_SUSPENDED blocks invite',
    ownerSuspended.json.ok === false && ownerSuspended.json.code === 'OWNER_SUSPENDED',
    ownerSuspended.json.code
  );

  const bundleC = await bootstrapApprovedVehicle(adminToken);
  const inviteC = await req(`/vehicles/${bundleC.vehicleId}/invite-driver`, {}, bundleC.ownerToken);
  const codeC = inviteC.json.data?.code as string;
  await req(`/admin/vehicles/${bundleC.vehicleId}/suspend`, {}, adminToken);
  const vehicleDisabled = await validateCode(codeC);
  record(
    'VEHICLE_DISABLED blocks invite',
    vehicleDisabled.json.ok === false && vehicleDisabled.json.code === 'VEHICLE_DISABLED',
    vehicleDisabled.json.code
  );

  const bundleD = await bootstrapApprovedVehicle(adminToken);
  const inviteD = await req(`/vehicles/${bundleD.vehicleId}/invite-driver`, {}, bundleD.ownerToken);
  const codeD = inviteD.json.data?.code ?? inviteD.json.data?.inviteCode;
  if (codeD) {
    const inviteRow = await prisma.vehicleInvite.findUnique({ where: { inviteCode: codeD } });
    if (inviteRow) {
      await prisma.vehicleInvite.update({
        where: { id: inviteRow.id },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });
    }
    const expired = await validateCode(codeD);
    record(
      'INVITE_EXPIRED after TTL',
      expired.json.ok === false && expired.json.code === 'INVITE_EXPIRED',
      expired.json.code
    );
  } else {
    record('INVITE_EXPIRED after TTL', false, 'No invite code generated');
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== INVITE HARDENING QA ===\nPASS: ${results.length - failed} | FAIL: ${failed}`);
  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

run().catch(async (error) => {
  console.error('QA FATAL:', error);
  await prisma.$disconnect();
  process.exit(1);
});
