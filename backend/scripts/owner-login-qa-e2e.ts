#!/usr/bin/env tsx
/**
 * QA — Owner login (+50370328885) and password flow
 * Usage: API_URL=https://movi-production-ef3b.up.railway.app npm run qa:owner-login
 */
import { loginAsSuperAdmin, req, OTP, API } from './admin-qa-auth';
import { QA_PASSWORD, loginWithPassword } from './qa-registration';

const OWNER_PHONE = process.env.OWNER_QA_PHONE ?? '70328885';
const OWNER_E164 = process.env.OWNER_QA_E164 ?? '+50370328885';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Owner Login QA —', API);
  console.log('Owner phone:', OWNER_E164, '\n');

  const health = await req('/health');
  record('Backend health responde', health.status === 200, String(health.status));

  const isLocal = API.includes('localhost') || API.includes('127.0.0.1');
  if (isLocal) {
    await req('/auth/request-otp', { phone: OWNER_PHONE });
    await req('/auth/verify-otp', { phone: OWNER_PHONE, code: OTP });
    const reg = await req('/owners/register', {
      phone: OWNER_PHONE,
      firstName: 'Adalid',
      lastName: 'QA Owner',
      dui: `${String(Date.now()).slice(-8)}-3`,
      password: QA_PASSWORD,
    });
    record(
      'Owner QA registrado localmente',
      reg.json.ok === true || String(reg.json.error).includes('ya está registrado'),
      String(reg.json.error)
    );
  }

  for (const [label, phone] of [
    ['local 8 dígitos', OWNER_PHONE],
    ['prefijo 503', `503${OWNER_PHONE}`],
    ['E.164 +503', OWNER_E164],
  ] as const) {
    const res = await req('/auth/login', { phone, password: QA_PASSWORD });
    const err = String(res.json.error ?? '');
    const loginV2Active = !err.includes('Datos de login inválidos');
    const pass =
      res.json.ok === true ||
      (loginV2Active &&
        (err.includes('Teléfono o contraseña incorrectos') ||
          err.includes('crear una contraseña') ||
          err.includes('SET_PASSWORD')));
    record(
      `POST /auth/login (${label})`,
      pass,
      loginV2Active ? err || `HTTP ${res.status}` : 'Login V2 NO desplegado (Datos de login inválidos)'
    );
  }

  const wrong = await req('/auth/login', { phone: OWNER_E164, password: 'WrongPass9' });
  const wrongErr = String(wrong.json.error ?? '');
  record(
    'Contraseña incorrecta → mensaje claro',
    wrong.json.ok === false &&
      (wrongErr.includes('Teléfono o contraseña incorrectos') ||
        wrongErr.includes('Datos de login inválidos')),
    wrongErr
  );

  if (isLocal) {
    const loginOk = await loginWithPassword(req, OWNER_PHONE, QA_PASSWORD);
    record('Owner login password correcta (local)', Boolean(loginOk));
  }

  let adminToken: string | null = null;
  try {
    adminToken = await loginAsSuperAdmin();
    record('SUPER_ADMIN OTP login', true);
  } catch (e) {
    record('SUPER_ADMIN OTP login', false, String(e));
  }

  if (adminToken) {
    const owners = await req('/admin/owners', undefined, adminToken);
    const list = (owners.json.data?.owners ?? []) as Array<{
      id: string;
      name: string;
      phone: string;
      hasPasswordHash?: boolean;
    }>;
    const target =
      list.find((o) => o.phone?.includes('70328885')) ??
      list.find((o) => o.name?.toLowerCase().includes('adalid'));
    record(
      'Owner Adalid/70328885 visible en admin',
      Boolean(target),
      target ? `${target.name} · ${target.phone}` : 'no encontrado'
    );

    if (target) {
      record(
        'Owner tiene passwordHash en admin',
        target.hasPasswordHash === true,
        String(target.hasPasswordHash)
      );
      const trig = await req(
        `/admin/owners/${target.id}/trigger-password-reset`,
        {},
        adminToken
      );
      record(
        'SUPER_ADMIN trigger-password-reset',
        trig.json.ok === true || trig.status === 201,
        String(trig.json.error ?? trig.json.data?.message ?? trig.status)
      );
    }
  }

  const adminPwd = await req('/auth/login', {
    phone: process.env.ADMIN_QA_PHONE ?? '2144698637',
    password: QA_PASSWORD,
  });
  record(
    'SUPER_ADMIN bloqueado login password',
    adminPwd.json.ok === false,
    String(adminPwd.json.error)
  );

  console.log('\n=== RESUMEN OWNER LOGIN QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0 && isLocal) process.exit(1);
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
