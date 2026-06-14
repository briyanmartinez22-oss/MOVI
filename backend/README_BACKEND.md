# MOVI Backend

NestJS + TypeScript + Prisma backend for the MOVI mobility platform.

## Stack

- **NestJS 11** — modular HTTP API
- **Prisma ORM** — SQLite (dev) / PostgreSQL (prod)
- **JWT** — authentication
- **WebSocket (`ws`)** — realtime trips, offers, chat, driver location (Socket.IO migration planned FASE 8)
- **Twilio** (optional) — SMS OTP in production
- **Local / S3** — file storage abstraction

## Requirements

- Node.js 20+
- npm

## Quick start

```bash
cd backend
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Server runs at **http://localhost:3001**

Health check:

```bash
curl http://localhost:3001/health
# {"status":"ok","service":"MOVI backend"}
```

WebSocket: `ws://localhost:3001/ws`

## Environment variables

See `.env.example` for the full list. Minimum for local dev:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite or PostgreSQL connection |
| `PORT` | `3001` | HTTP + WS port |
| `JWT_SECRET` | dev default | JWT signing secret |
| `DEMO_OTP_CODE` | `123456` | Fixed OTP in demo SMS mode |
| `CORS_ORIGIN` | `*` | CORS allowed origin |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run compiled server |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:push` | Push schema without migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed dev data (FASE 16) |

## Module structure (FASE 1)

```
src/
├── auth/           Auth OTP, login, JWT
├── passengers/     Passenger registration
├── owners/         Owner registration & verification
├── vehicles/       Vehicle CRUD & driver invites
├── drivers/        Driver invite registration & sessions
├── businesses/     Business registration
├── trips/          Trip requests, offers, lifecycle
├── admin/          Admin approvals
├── locations/      Demand zones
├── uploads/        File uploads
├── realtime/       WebSocket trip hub
├── users/          (FASE 4)
├── offers/         (FASE 7 split)
├── deliveries/     (FASE 6)
├── subscriptions/  (FASE 11)
├── payments/       (FASE 11)
├── notifications/  (FASE 10)
├── chat/           (FASE 9)
└── analytics/      (FASE 12)
```

## API response format

All endpoints except `/health` return:

```json
{ "ok": true, "data": { ... } }
```

Errors:

```json
{ "ok": false, "error": "message" }
```

## Demo OTP

In development (no Twilio credentials), OTP is always **`123456`** and logged to console.

## PostgreSQL (production)

```bash
docker compose up -d
# Set in .env:
# DATABASE_PROVIDER=postgresql
# DATABASE_URL=postgresql://movi:movi@localhost:5432/movi?schema=public
npm run db:migrate
```

## Frontend connection

Set in MOVI `.env`:

```
EXPO_PUBLIC_API_URL=http://<LAN-IP>:3001
EXPO_PUBLIC_WS_URL=ws://<LAN-IP>:3001/ws
EXPO_PUBLIC_USE_MOCK_API=false
```

For physical iPhone, use your machine's LAN IP — not `localhost`.
