# MOVI Backend — Despliegue remoto

## Requisitos

- Node.js 22+
- PostgreSQL (Railway, Render o Supabase)
- Variables en `.env` (ver `.env.example`)

## Variables obligatorias (producción)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | `postgresql://...` |
| `JWT_SECRET` | Secreto largo aleatorio |
| `NODE_ENV` | `production` |
| `PORT` | Lo asigna Railway/Render automáticamente |
| `PUBLIC_URL` | URL pública HTTPS del servicio |
| `CORS_ORIGIN` | `*` o dominio específico |
| `DEMO_OTP_CODE` | `123456` para pruebas |

## Comandos

```bash
# Desarrollo local
npm run dev

# Build
npm run build

# Migraciones + arranque producción
npm run start:prod

# Seed demo (una vez por entorno)
npm run db:seed

# Validación
npm run prisma:validate
npm run prisma:migrate:status
npm run qa:remote   # con API_URL=https://...
```

## Docker

```bash
docker build -t movi-backend .
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  -e NODE_ENV=production \
  movi-backend
```

## Health check

`GET /health` — debe retornar `status: ok` y `database: connected`.

## WebSocket

Mismo host que HTTP, path `/ws`:
- Local: `ws://localhost:3001/ws`
- Producción: `wss://TU_DOMINIO/ws`

No requiere Socket.IO — usa WebSocket nativo (`ws`).

## PostgreSQL en la nube

### Railway
1. New Project → Add PostgreSQL
2. Copiar `DATABASE_URL` al servicio backend
3. Deploy desde `backend/` con Dockerfile

### Render
1. Usar `render.yaml` en este directorio
2. Blueprint crea DB + web service

### Supabase
1. Project Settings → Database → Connection string (URI)
2. Usar como `DATABASE_URL` en Railway/Render

Tras conectar DB:

```bash
npm run db:migrate:deploy
npm run db:seed
```
