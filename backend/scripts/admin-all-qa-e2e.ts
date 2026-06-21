#!/usr/bin/env tsx
/**
 * QA — All admin center modules
 * Usage: npm run qa:admin-all
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const scripts = [
  'operations-live-qa-e2e.ts',
  'dispatch-qa-e2e.ts',
  'admin-security-qa-e2e.ts',
  'finance-qa-e2e.ts',
  'support-qa-e2e.ts',
];

let failed = 0;
for (const script of scripts) {
  console.log(`\n>>> Running ${script}\n`);
  const result = spawnSync('tsx', [join(dir, script)], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) failed += 1;
}

console.log(`\n=== ADMIN ALL QA: ${failed} suite(s) failed ===`);
if (failed > 0) process.exit(1);
