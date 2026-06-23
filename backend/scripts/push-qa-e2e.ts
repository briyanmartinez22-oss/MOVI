#!/usr/bin/env tsx
/**
 * QA — Expo push notifications
 * Usage: npm run qa:push
 */
const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';
const QA_PASSWORD = process.env.QA_TEST_PASSWORD ?? 'QaTest123';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

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

async function loginPassenger(): Promise<string> {
  const phone = `74${String(Date.now()).slice(-6)}`;
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const reg = await req('/passengers/register', {
    phone,
    fullName: 'QA Push Passenger',
    password: QA_PASSWORD,
  });
  const token = reg.json.data?.authToken as string | undefined;
  if (!token) throw new Error('No auth token for push QA');
  return token;
}

async function run() {
  console.log('MOVI Push QA —', API, '\n');

  const status = await req('/integrations/status');
  const push = status.json.data?.push ?? status.json.push;
  record('GET /integrations/status responde', status.status === 200 && Boolean(push));
  record(
    'Push status expone expo/none',
    typeof push?.configured?.expo === 'boolean' && typeof push?.active === 'string'
  );

  const token = await loginPassenger();
  const fakeExpoToken = `ExponentPushToken[qa-${Date.now()}]`;

  const register = await req(
    '/notifications/push-token',
    { token: fakeExpoToken, platform: 'android', deviceId: 'qa-device' },
    token
  );
  record(
    'POST /notifications/push-token registra token',
    register.status === 201 || register.status === 200 || register.json.ok === true,
    register.json.error
  );

  const unauth = await req('/notifications/push-token', {
    token: fakeExpoToken,
    platform: 'android',
  });
  record(
    'push-token requiere autenticación',
    unauth.status === 401 || unauth.json.ok === false
  );

  const invalid = await req(
    '/notifications/push-token',
    { token: 'short', platform: 'android' },
    token
  );
  record(
    'push-token rechaza payload inválido',
    invalid.status === 400 || invalid.json.ok === false
  );

  const list = await req('/notifications', undefined, token);
  record(
    'GET /notifications responde',
    list.status === 200 && Array.isArray(list.json.data?.notifications ?? list.json.notifications)
  );

  console.log('\n=== RESUMEN PUSH QA ===');
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
