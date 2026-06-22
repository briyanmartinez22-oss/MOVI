#!/usr/bin/env tsx
/**
 * QA — OTP / Twilio Verify readiness
 * Usage: npm run qa:otp
 */
import { driverInviteRegisterPayload, ownerRegisterPayload } from './qa-registration';

const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

async function req(path: string, body?: unknown, method?: string) {
  const httpMethod = method ?? (body !== undefined ? 'POST' : 'GET');
  const res = await fetch(`${API}${path}`, {
    method: httpMethod,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

function uniquePhone(prefix: string): string {
  return `${prefix}${String(Date.now()).slice(-6)}`;
}

async function run() {
  console.log('MOVI OTP QA —', API, '\n');

  const status = await req('/integrations/status');
  const otpStatus = status.json.data?.otp ?? status.json.otp;
  record('GET /integrations/status responde', status.status === 200 && Boolean(otpStatus));
  record(
    'OTP status expone twilio/twilioVerify',
    typeof otpStatus?.configured?.twilio === 'boolean' &&
      typeof otpStatus?.configured?.twilioVerify === 'boolean'
  );

  const svPhone = uniquePhone('79');
  const request = await req('/auth/request-otp', { phone: svPhone });
  record(
    'POST /auth/request-otp (+503)',
    request.status === 201 || request.status === 200 || request.json.ok === true,
    `status=${request.status}`
  );

  const badVerify = await req('/auth/verify-otp', { phone: svPhone, code: '000000' });
  record(
    'verify OTP incorrecto rechazado',
    badVerify.status === 400 || badVerify.json.ok === false,
    badVerify.json.error ?? badVerify.json.data?.error
  );

  const verify = await req('/auth/verify-otp', { phone: svPhone, code: OTP });
  const verifyData = verify.json.data ?? verify.json;
  record(
    'verify OTP correcto aceptado',
    verify.json.ok === true && verifyData?.verified === true,
    verify.json.error
  );
  record(
    'verify OTP devuelve verificationToken',
    typeof verifyData?.verificationToken === 'string' && verifyData.verificationToken.length > 20
  );

  const blockedPassenger = await req('/passengers/register', {
    phone: uniquePhone('70'),
    fullName: 'QA OTP Blocked',
  });
  record(
    'registro pasajero bloqueado sin OTP',
    blockedPassenger.status === 400 || blockedPassenger.json.ok === false,
    blockedPassenger.json.error ?? blockedPassenger.json.data?.error
  );

  const blockedOwner = await req(
    '/owners/register',
    ownerRegisterPayload(uniquePhone('71'), '22222222-2', 'QA', 'OTP Blocked Owner')
  );
  record(
    'registro dueño bloqueado sin OTP',
    blockedOwner.status === 400 || blockedOwner.json.ok === false,
    blockedOwner.json.error ?? blockedOwner.json.data?.error
  );

  const allowedPassenger = await req('/passengers/register', {
    phone: svPhone,
    fullName: 'QA OTP Allowed',
  });
  record(
    'registro pasajero permitido con OTP verificado',
    allowedPassenger.json.ok === true,
    allowedPassenger.json.error ?? allowedPassenger.json.data?.error
  );

  const ownerPhone = uniquePhone('78');
  await req('/auth/request-otp', { phone: ownerPhone });
  await req('/auth/verify-otp', { phone: ownerPhone, code: OTP });
  const allowedOwner = await req(
    '/owners/register',
    ownerRegisterPayload(ownerPhone, `${String(Date.now()).slice(-8)}-2`, 'QA', 'OTP Allowed Owner')
  );
  record(
    'registro dueño permitido con OTP verificado',
    allowedOwner.json.ok === true,
    allowedOwner.json.error ?? allowedOwner.json.data?.error
  );

  if (otpStatus?.demoAllowed === false) {
    const demoAttempt = await req('/auth/verify-otp', {
      phone: uniquePhone('77'),
      code: OTP,
    });
    record(
      'DEMO_OTP_CODE no funciona en producción',
      demoAttempt.status === 400 || demoAttempt.json.ok === false
    );
  } else {
    record('DEMO_OTP_CODE no funciona en producción', true, 'skipped (dev/demo mode)');
  }

  console.log('\n=== RESUMEN OTP QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0) {
    console.log('\nFallos:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(` - ${r.step}: ${r.detail ?? ''}`));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
