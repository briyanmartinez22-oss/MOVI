#!/usr/bin/env tsx
/**
 * Reset producción vía API (requiere token SUPER_ADMIN).
 * Usage:
 *   API_URL=https://movi-production-ef3b.up.railway.app \
 *   ADMIN_TOKEN="<jwt>" \
 *   npx tsx scripts/production-reset-beta.ts
 */
const API = process.env.API_URL ?? 'https://movi-production-ef3b.up.railway.app';
const TOKEN = process.env.ADMIN_TOKEN ?? process.env.ADMIN_QA_TOKEN;

if (!TOKEN) {
  console.error('Set ADMIN_TOKEN (JWT de SUPER_ADMIN)');
  process.exit(1);
}

async function main() {
  const res = await fetch(`${API}/admin/system/reset-beta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ confirm: 'RESET_BETA_PLATFORM' }),
  });
  const json = await res.json();
  console.log(res.status, JSON.stringify(json, null, 2));
  if (!res.ok || !json.ok) process.exit(1);
}

main();
