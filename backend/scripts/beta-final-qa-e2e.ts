#!/usr/bin/env tsx
/**
 * QA final consolidado — preparación beta MOVI El Salvador
 * Usage: npm run qa:beta-final
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const API = process.env.API_URL ?? 'http://localhost:3001';

const suites = [
  { name: 'typecheck', cmd: 'npm', args: ['run', 'typecheck'], cwd: join(dir, '..', '..') },
  { name: 'backend-build', cmd: 'npm', args: ['run', 'build'], cwd: join(dir, '..') },
  { name: 'qa:integrations', cmd: 'npm', args: ['run', 'qa:integrations'], cwd: join(dir, '..') },
  { name: 'qa:otp', cmd: 'npm', args: ['run', 'qa:otp'], cwd: join(dir, '..') },
  { name: 'qa:auth', cmd: 'npm', args: ['run', 'qa:auth'], cwd: join(dir, '..') },
  { name: 'qa:maps', cmd: 'npm', args: ['run', 'qa:maps'], cwd: join(dir, '..') },
  { name: 'qa:push', cmd: 'npm', args: ['run', 'qa:push'], cwd: join(dir, '..') },
  { name: 'qa:admin-entities', cmd: 'npm', args: ['run', 'qa:admin-entities'], cwd: join(dir, '..') },
  { name: 'qa:admin-all', cmd: 'npm', args: ['run', 'qa:admin-all'], cwd: join(dir, '..') },
  { name: 'qa:beta-closed', cmd: 'npm', args: ['run', 'qa:beta-closed'], cwd: join(dir, '..') },
];

type Result = { suite: string; status: 'PASS' | 'FAIL' };
const results: Result[] = [];

console.log('MOVI BETA FINAL QA —', API, '\n');

for (const suite of suites) {
  console.log(`\n>>> ${suite.name}\n`);
  const result = spawnSync(suite.cmd, suite.args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      API_URL: API,
      DEMO_OTP_ENABLED: API.includes('localhost') ? 'true' : process.env.DEMO_OTP_ENABLED ?? 'false',
    },
    cwd: suite.cwd,
  });
  results.push({ suite: suite.name, status: result.status === 0 ? 'PASS' : 'FAIL' });
}

console.log('\n══════════════════════════════════════');
console.log('REPORTE QA FINAL BETA');
console.log('══════════════════════════════════════');
for (const r of results) {
  console.log(`${r.status === 'PASS' ? '✓' : '✗'} ${r.suite}`);
}
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
console.log(`\nPASS: ${pass} | FAIL: ${fail} | TOTAL: ${results.length}`);
if (fail > 0) process.exit(1);
