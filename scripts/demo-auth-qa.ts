/**
 * Verifica login demo por rol contra mockApi + mockStore.
 * Ejecutar: npx tsx scripts/demo-auth-qa.ts
 */
import { DEMO_OTP_CODE } from '../src/services/otpService';
import {
  DEMO_SEED,
  listDemoLoginAccounts,
  syncDemoManifestFromStore,
} from '../src/data/demoCredentials';
import * as mockApi from '../src/services/mockApi';
import { getStore, resetStoreToSeed } from '../src/services/mockStore';
import { getRoleHomeRoute, duiFormatVariants } from '../src/utils/platform';

const storage = new Map<string, string>();
// @ts-expect-error mock AsyncStorage web backend for Node
globalThis.window = {
  localStorage: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
    clear: () => storage.clear(),
    key: (i: number) => [...storage.keys()][i] ?? null,
    get length() {
      return storage.size;
    },
  },
};

type FlowResult = {
  roleLabel: string;
  phone: string;
  dui: string;
  role: string;
  status: string;
  otp: string;
  dashboard: string;
  ok: boolean;
  error?: string;
};

async function runRoleFlow(
  roleLabel: string,
  phone: string,
  dui: string,
  role: string
): Promise<FlowResult> {
  const base = { roleLabel, phone, dui, role, otp: DEMO_OTP_CODE, dashboard: '-', status: 'pending', ok: false };
  try {
    const otpReq = await mockApi.requestOtp(phone);
    if (!otpReq.ok) throw new Error(otpReq.error ?? 'OTP request failed');

    const verify = await mockApi.verifyOtp(phone, DEMO_OTP_CODE);
    if (!verify.ok) throw new Error(verify.error ?? 'OTP verify failed');
    if (verify.data?.isNewUser) {
      throw new Error('Usuario no encontrado en store (isNewUser=true)');
    }

    const login = await mockApi.loginWithOtp(phone, dui, DEMO_OTP_CODE);
    if (!login.ok || !login.data) throw new Error(login.error ?? 'Login failed');
    if (login.data.role !== role) {
      throw new Error(`Rol esperado ${role}, recibido ${login.data.role}`);
    }

    const dashboard = getRoleHomeRoute(login.data.role);
    return { ...base, status: 'ok', dashboard, ok: true };
  } catch (err) {
    return {
      ...base,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log('=== MOVI Demo Auth QA ===\n');
  console.log(`Semilla demo: ${DEMO_SEED}\n`);

  await resetStoreToSeed();
  await syncDemoManifestFromStore(getStore());

  const accounts = listDemoLoginAccounts(getStore());
  const primaryByRole = [
    accounts.find((a) => a.role === 'passenger'),
    accounts.find((a) => a.role === 'driver'),
    accounts.find((a) => a.role === 'owner'),
    accounts.find((a) => a.role === 'business'),
    accounts.find((a) => a.role === 'admin'),
  ].filter(Boolean);

  console.log('--- Cuentas demo registradas en store ---\n');
  console.log(
    '| Rol | Teléfono | DUI | Estado store |',
    '\n|-----|----------|-----|--------------|'
  );
  for (const a of accounts) {
    console.log(
      `| ${a.roleLabel} | ${a.phone} | ${a.dui} | ${a.status === 'ok' ? 'registrado' : 'FALTA'} |`
    );
  }

  console.log('\n--- QA: Teléfono → OTP → Login → Dashboard ---\n');
  const flows: FlowResult[] = [];
  for (const account of primaryByRole) {
    const result = await runRoleFlow(
      account!.roleLabel,
      account!.phone,
      account!.dui,
      account!.role
    );
    flows.push(result);
    console.log(
      `${result.ok ? '✓' : '✗'} ${result.roleLabel}: ${result.phone} / ${result.dui} → ${result.dashboard}${
        result.error ? ` (${result.error})` : ''
      }`
    );
  }

  const passed = flows.filter((f) => f.ok).length;
  console.log(`\nResultado: ${passed}/${flows.length} flujos OK`);

  console.log('\n--- QA: Formatos DUI (teclado numérico iOS) ---\n');
  let formatPassed = 0;
  let formatTotal = 0;
  for (const account of primaryByRole) {
    const variants = duiFormatVariants(account!.dui);
    for (const variant of variants) {
      formatTotal++;
      const result = await runRoleFlow(
        `${account!.roleLabel} [${variant}]`,
        account!.phone,
        variant,
        account!.role
      );
      if (result.ok) formatPassed++;
      console.log(`${result.ok ? '✓' : '✗'} ${account!.roleLabel} DUI "${variant}" → ${result.dashboard}`);
    }
  }
  console.log(`\nFormatos DUI: ${formatPassed}/${formatTotal} OK`);

  if (passed !== flows.length || formatPassed !== formatTotal) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
