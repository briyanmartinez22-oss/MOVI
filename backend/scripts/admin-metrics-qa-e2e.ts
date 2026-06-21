#!/usr/bin/env tsx
/**
 * QA — admin metrics / reporting endpoints
 * Usage: npm run qa:admin-metrics
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loginAsSuperAdmin } from './admin-qa-auth';

const API = process.env.API_URL ?? 'http://localhost:3001';
const ROOT = join(__dirname, '..', '..'); = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

const METRIC_ENDPOINTS = [
  '/admin/metrics/summary',
  '/admin/metrics/providers',
  '/admin/metrics/trips',
  '/admin/metrics/ratings',
  '/admin/metrics/subscriptions',
  '/admin/metrics/recent-activity',
] as const;

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

async function loginAsAdmin(): Promise<string> {
  return loginAsSuperAdmin();
}

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function checkNoMockApiInAdminScreens(): boolean {
  const adminDir = join(ROOT, 'app', 'admin');
  const componentDir = join(ROOT, 'src', 'components', 'admin');
  const files = [
    join(adminDir, 'index.tsx'),
    join(adminDir, 'analytics.tsx'),
    join(adminDir, 'operations.tsx'),
    join(adminDir, 'providers.tsx'),
    join(adminDir, 'trips.tsx'),
    join(adminDir, 'verifications.tsx'),
    join(componentDir, 'ExecutiveKpiGrid.tsx'),
    join(componentDir, 'DashboardSections.tsx'),
    join(componentDir, 'OperationsSnapshot.tsx'),
  ];

  const offenders: string[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (content.includes("from '../../src/services/mockApi'") ||
        content.includes("from '../../services/mockApi'") ||
        content.includes("from '../services/mockApi'")) {
      offenders.push(file.replace(ROOT + '/', ''));
    }
  }
  if (offenders.length > 0) {
    record('Admin screens sin mockApi', false, offenders.join(', '));
    return false;
  }
  record('Admin screens sin mockApi', true);
  return true;
}

async function run() {
  console.log('MOVI Admin Metrics QA —', API, '\n');

  const adminToken = await loginAsAdmin();
  record('0. Auth admin', !!adminToken);

  for (const path of METRIC_ENDPOINTS) {
    const res = await req(path, undefined, adminToken);
    const data = res.json.data;
    record(
      `GET ${path} responde 200`,
      res.status === 200 && res.json.ok === true,
      res.json.error ?? `status=${res.status}`
    );

    if (!data || typeof data !== 'object') {
      record(`${path} retorna objeto`, false, 'data vacío');
      continue;
    }
    record(`${path} retorna objeto`, true);
  }

  const summary = (await req('/admin/metrics/summary', undefined, adminToken)).json.data as Record<
    string,
    unknown
  >;

  const summaryChecks: [string, unknown][] = [
    ['totalPassengers', summary?.totalPassengers],
    ['totalProviders', summary?.totalProviders],
    ['providersPendingVerification', summary?.providersPendingVerification],
    ['providersVerified', summary?.providersVerified],
    ['tripsRequested', summary?.tripsRequested],
    ['tripsActive', summary?.tripsActive],
    ['tripsCompleted', summary?.tripsCompleted],
    ['totalOffers', summary?.totalOffers],
    ['avgProviderRating', summary?.avgProviderRating],
    ['avgPassengerRating', summary?.avgPassengerRating],
    ['driversOnline', summary?.driversOnline],
    ['subscriptionsActive', summary?.subscriptionsActive],
    ['projectedMonthlyRevenueUsd', summary?.projectedMonthlyRevenueUsd],
  ];

  const allNumbers = summaryChecks.every(([, v]) => isNumber(v));
  record('KPIs summary son números reales', allNumbers, allNumbers ? undefined : 'campo no numérico');

  const active = summary?.subscriptionsActive as number;
  const revenue = summary?.projectedMonthlyRevenueUsd as number;
  record(
    'Ingreso mensual = ACTIVE × 7 USD',
    isNumber(active) && isNumber(revenue) && revenue === active * 7,
    `active=${active} revenue=${revenue}`
  );

  const subscriptions = (await req('/admin/metrics/subscriptions', undefined, adminToken)).json
    .data as { projectedMonthlyRevenueUsd?: number; active?: number };
  record(
    'Suscripciones coheren con summary',
    subscriptions?.active === active &&
      subscriptions?.projectedMonthlyRevenueUsd === (active ?? 0) * 7
  );

  checkNoMockApiInAdminScreens();

  console.log('\n=== RESUMEN ADMIN METRICS QA ===');
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
