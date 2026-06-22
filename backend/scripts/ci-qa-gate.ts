#!/usr/bin/env tsx
/**
 * CI quality gate — backend build + critical QA flows.
 * Usage: API_URL=https://staging.example.com npm run test
 */
import { spawnSync } from 'node:child_process';

const API = process.env.API_URL ?? 'http://localhost:3001';

function run(label: string, command: string, args: string[]) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, API_URL: API, DEMO_OTP_ENABLED: 'true' },
  });
  if (result.status !== 0) {
    console.error(`✗ ${label} failed`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${label}`);
}

console.log('MOVI CI QA Gate —', API);

run('Backend build', 'npm', ['run', 'build']);
run('MVP QA', 'npx', ['tsx', 'scripts/mvp-qa-e2e.ts']);
run('Verification QA', 'npx', ['tsx', 'scripts/verification-qa-e2e.ts']);
run('Invite hardening QA', 'npx', ['tsx', 'scripts/invite-hardening-qa-e2e.ts']);
run('Admin entities QA', 'npx', ['tsx', 'scripts/admin-entities-qa-e2e.ts']);
run('Operations Live QA', 'npx', ['tsx', 'scripts/operations-live-qa-e2e.ts']);

console.log('\n✓ CI QA gate passed (100%)');
