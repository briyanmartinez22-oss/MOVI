# MOVI — Deployment

## Repositorio GitHub

| Propiedad | Valor |
|-----------|-------|
| URL | `https://github.com/briyanmartinez22-oss/MOVI.git` |
| Estructura | Monorepo (frontend raíz + `backend/`) |
| Branch principal | `main` (verificar con `git branch`) |

### Flujo de cambios

1. Commit en feature branch o main
2. Push a GitHub
3. Railway auto-deploy en push (si configurado) o deploy manual
4. EAS build para APK/iOS cuando hay cambios frontend

---

## Railway — Backend

### Configuración

| Archivo | Ubicación |
|---------|-----------|
| `railway.json` | `backend/railway.json` |
| `Dockerfile` | `backend/Dockerfile` |
| Root directory Railway | **`backend/`** (configurar en dashboard Railway) |

### Build (Docker)

```dockerfile
# Multi-stage: node:22-alpine
# 1. npm ci → prisma generate → nest build
# 2. Runner: dist + prisma + node_modules production
# CMD: prisma generate && prisma migrate deploy && node dist/main.js
```

### Health check

- Path: `/health`
- Timeout: 60s (railway.json)
- Restart policy: ON_FAILURE, max 5 retries

### URL producción

```
https://movi-production-ef3b.up.railway.app
```

### Proceso de deploy backend

1. Push cambios a GitHub
2. Railway detecta cambio y builda Docker image
3. Al iniciar container:
   - `prisma generate`
   - `prisma migrate deploy` (aplica migrations pendientes)
   - `node dist/main.js`
   - `ensureSuperAdmin()` en bootstrap
4. Verificar:
   ```bash
   curl https://movi-production-ef3b.up.railway.app/health
   ```

### Deploy manual local (emergencia)

```bash
cd backend
npm ci
npm run build
# Con DATABASE_URL de Railway:
npx prisma migrate deploy
node dist/main.js
```

---

## Variables de entorno — Backend (Railway)

### Obligatorias en producción

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Railway plugin) |
| `JWT_SECRET` | Secret fuerte para JWT (no usar default) |
| `NODE_ENV` | `production` |
| `TWILIO_ACCOUNT_SID` | Twilio account |
| `TWILIO_AUTH_TOKEN` | Twilio auth |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service |

### Integraciones

| Variable | Descripción |
|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Google Maps geocoding/routes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary storage |
| `CLOUDINARY_API_KEY` | Cloudinary |
| `CLOUDINARY_API_SECRET` | Cloudinary |
| `CLOUDINARY_FOLDER` | Folder default: `movi` |
| `PUBLIC_URL` | URL pública del backend |
| `CORS_ORIGIN` | Origen CORS (default `*`) |
| `PORT` | Puerto (Railway inyecta automáticamente) |

### Opcionales

| Variable | Descripción |
|----------|-------------|
| `OTP_PROVIDER` | `twilio` (prod) / `demo` (dev) |
| `STORAGE_PROVIDER` | `cloudinary` / `s3` / `local` |
| `MAPS_PROVIDER` | `google` / `mapbox` / `fallback` |
| `PUSH_PROVIDER` | `expo` / `firebase` / `none` |
| `EXPO_ACCESS_TOKEN` | Expo push notifications |
| `SUPER_ADMIN_DUI` | Override DUI super admin |
| `SUPER_ADMIN_NAME` | Override nombre super admin |
| `AUTH_LOGIN_DEBUG` | `1` para logs de login debug |
| `DEMO_OTP_ENABLED` | Solo dev — nunca en prod |

### Validación en startup

`assertEnv()` en producción rechaza:

- `JWT_SECRET` default
- `DATABASE_URL` no PostgreSQL
- `OTP_PROVIDER=demo`
- Twilio Verify no configurado

---

## Variables de entorno — Frontend (EAS / Expo)

### Obligatorias para producción

| Variable | Valor producción | Descripción |
|----------|------------------|-------------|
| `EXPO_PUBLIC_API_URL` | `https://movi-production-ef3b.up.railway.app` | Base URL REST |
| `EXPO_PUBLIC_WS_URL` | `wss://movi-production-ef3b.up.railway.app/ws` | WebSocket |
| `EXPO_PUBLIC_USE_MOCK_API` | `false` | Desactivar mock |

Configuradas en:

- `eas.json` (profiles `preview` y `production`)
- `app.json` → `expo.extra`
- `.env` local (no commitear)

### Local dev

```bash
# Copiar ejemplo y editar
cp .env.remote.example .env

EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
EXPO_PUBLIC_WS_URL=ws://192.168.x.x:3001/ws
EXPO_PUBLIC_USE_MOCK_API=false
```

**Nunca usar `localhost` en dispositivo físico** — usar IP LAN.

---

## Proceso APK Android

### Prerequisitos

- Cuenta Expo (`briyangm`)
- EAS CLI (`npx eas-cli`)
- Project ID: `39a33436-1ef3-4b71-a835-b4cc22a4cde2`

### Build preview (APK interno)

```bash
cd MOVI
npm run build:android
# Equivale a:
npx eas-cli build --platform android --profile preview --non-interactive
```

Profile `preview` en `eas.json`:

- `distribution: internal`
- `android.buildType: apk`
- Env vars de producción baked in

### Instalación

1. EAS genera link de descarga APK
2. Distribuir link a testers beta
3. Instalar en Android (permite sideload)

### Verificar APK

Tras instalar, confirmar en app:

- Login no muestra error de localhost
- Health check: la app conecta a Railway URL
- Diagnostics panel (si disponible en dev) muestra API URL correcta

---

## Proceso iOS

### Build preview

```bash
cd MOVI
npm run build:ios
# npx eas-cli build --platform ios --profile preview --non-interactive
```

### Configuración iOS

| Propiedad | Valor |
|-----------|-------|
| Bundle ID | `com.movi.app` |
| Simulator | `false` (preview profile) |

### TestFlight (pendiente P1)

1. Build con profile `production` (autoIncrement)
2. `eas submit --platform ios`
3. Configurar en App Store Connect
4. Invitar testers beta vía TestFlight

**Estado:** No desplegado a TestFlight aún — prioridad P1.

### Requisitos Apple

- Apple Developer account
- Certificados y provisioning profiles (EAS managed)
- Info.plist permissions ya configurados en `app.json`

---

## Local development stack

```bash
# 1. PostgreSQL
cd backend && docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run dev
# → http://localhost:3001

# 3. Frontend
cd ..  # raíz MOVI
npm install
npm start
# o npm run android / npm run ios
```

---

## QA pre-deploy checklist

```bash
# Desde raíz MOVI
npm run qa:auth          # Auth flows
npm run qa:owner-login   # Owner login específico
npm run qa:integrations  # Twilio, Maps, Cloudinary
npm run qa:beta-final    # Suite beta completa
npm run test:ci          # CI gate
```

Contra producción:

```bash
cd backend
API_URL=https://movi-production-ef3b.up.railway.app npm run qa:owner-login
```

---

## Rollback

### Railway

1. Railway dashboard → Deployments → seleccionar deploy anterior → Redeploy
2. Si migration falló: revisar `prisma migrate status` en logs

### Database

- No hay rollback automático de migrations
- Backup PostgreSQL vía Railway plugin antes de migrations destructivas
- Script `db:reset-beta` solo para entornos beta (destructivo)

---

## Monitoreo

| Endpoint | Uso |
|----------|-----|
| `GET /health` | Uptime monitoring |
| `GET /admin/system/status` | Estado integraciones (SUPER_ADMIN) |
| Railway logs | Errores runtime, prisma migrate |
| `AUTH_LOGIN_DEBUG=1` | Debug login temporal |
