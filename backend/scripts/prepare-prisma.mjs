import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const explicitProvider = process.env.DATABASE_PROVIDER;

const provider =
  explicitProvider ??
  (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')
    ? 'postgresql'
    : 'sqlite');

let schema = fs.readFileSync(schemaPath, 'utf8');
schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${provider}"`);
fs.writeFileSync(schemaPath, schema);
console.log(`Prisma datasource provider: ${provider}`);
