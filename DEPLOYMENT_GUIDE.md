# MOVI — Guía de despliegue (Railway + PostgreSQL)

Guía operativa para dejar el backend público y conectar la app Expo desde El Salvador.

---

## 1. Railway — paso a paso

1. Entra a [https://railway.app](https://railway.app) e inicia sesión.
2. **New Project** → **Deploy from GitHub repo** (conecta el repositorio MOVI).
3. En el servicio creado, abre **Settings** → **Root Directory** → `backend`.
4. Railway detecta automáticamente `backend/Dockerfile` y `backend/railway.json`.
5. Añade un servicio **PostgreSQL** al mismo proyecto (**Add Service → Database → PostgreSQL**).
6. En el servicio backend, ve a **Variables** y configura las variables de la sección 3.
7. Copia `DATABASE_URL` desde el servicio PostgreSQL (**Connect → Postgres connection URL**).
8. Pulsa **Deploy** (o espera el deploy automático tras push).
9. Tras el primer deploy exitoso, ejecuta migraciones y seed (secciones 4 y 5).
10. Obtén la URL pública (sección 7) y configura Expo (PASO 8 del checklist).

---

## 2. PostgreSQL — paso a paso

### Opción A — PostgreSQL en Railway (recomendada)

1. En el proyecto Railway: **Add Service → Database → PostgreSQL**.
2. Abre el servicio PostgreSQL → pestaña **Connect**.
3. Copia **Postgres Connection URL** (formato `postgresql://postgres:PASSWORD@HOST:PORT/railway`).
4. Pégala como `DATABASE_URL` en el servicio backend.
5. No uses SQLite en producción; el backend exige PostgreSQL cuando `NODE_ENV=production`.

### Opción B — Supabase PostgreSQL + Railway API

1. Crea proyecto en [Supabase](https://supabase.com) → **Project Settings → Database**.
2. Copia **Connection string** (URI, modo direct o pooler según tu plan).
3. Despliega solo el backend en Railway con esa `DATABASE_URL`.
4. Ejecuta migraciones y seed contra esa URL (secciones 4 y 5).

### Opción C — Render Blueprint

1. Conecta el repo y usa `backend/render.yaml`.
2. Render crea `movi-postgres` + `movi-backend` automáticamente.
3. Tras el deploy, configura `PUBLIC_URL` con la URL del servicio web.
4. Ejecuta seed en Render Shell (sección 5).

---

## 3. Variables requeridas

### Backend (Railway / Render / Docker)

| Variable | Obligatoria | Ejemplo / notas |
|----------|-------------|-----------------|
| `NODE_ENV` | Sí | `production` |
| `DATABASE_URL` | Sí | `postgresql://user:pass@host:5432/movi?schema=public` |
| `JWT_SECRET` | Sí | String aleatorio ≥ 32 caracteres (nunca el valor de dev) |
| `PORT` | Auto | Railway/Render lo inyectan; default local `3001` |
| `PUBLIC_URL` | Recomendada | `https://movi-backend-production.up.railway.app` |
| `CORS_ORIGIN` | Sí | `*` para pruebas remotas |
| `DEMO_OTP_CODE` | Sí (QA) | `123456` |
| `STORAGE_MODE` | Sí | `local` |

Plantilla: `backend/.env.example`

### Expo (raíz del repo — archivo `.env`)

| Variable | Obligatoria | Ejemplo / notas |
|----------|-------------|-----------------|
| `EXPO_PUBLIC_API_URL` | Sí | `https://TU_BACKEND.up.railway.app` |
| `EXPO_PUBLIC_WS_URL` | Recomendada | `wss://TU_BACKEND.up.railway.app/ws` |
| `EXPO_PUBLIC_USE_MOCK_API` | Sí | `false` |

Plantillas: `.env.example`, `.env.remote.example`

---

## 4. Cómo ejecutar migraciones

El contenedor Docker ejecuta `prisma migrate deploy` al arrancar. Para la **primera vez** o si falló el arranque:

### Desde tu máquina (con `DATABASE_URL` remota)

```bash
cd backend
export DATABASE_URL="postgresql://..."
export JWT_SECRET="tu-secreto"
npm run db:migrate:deploy
```

### Desde Railway CLI

```bash
cd backend
railway link
railway run npm run db:migrate:deploy
```

### Verificar estado

```bash
cd backend
npm run prisma:migrate:status
```

Debe mostrar: **Database schema is up to date!**

---

## 5. Cómo ejecutar seed

El seed carga cuentas demo de El Salvador (OTP `123456`). Ejecutar **una vez por entorno** después de migraciones.

### Desde tu máquina (recomendado)

```bash
cd backend
export DATABASE_URL="postgresql://..."
npm run db:seed
```

### Desde Railway CLI

```bash
cd backend
railway run npm run db:seed
```

> **Nota:** El contenedor de producción no incluye `tsx`. El seed debe ejecutarse desde tu repo local o con `railway run`, no dentro del shell del contenedor en ejecución.

Cuentas demo tras seed:

| Rol | Teléfono | DUI | OTP |
|-----|----------|-----|-----|
| Admin | 70801111 | 00000000-0 | 123456 |
| Pasajero | 78214898 | 71542253-8 | 123456 |
| Dueño | 71234567 | 04567890-1 | 123456 |
| Conductor | 78981234 | 12345678-9 | 123456 |

---

## 6. Cómo verificar `/health`

```bash
curl -s https://TU_URL_PUBLICA/health | jq .
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "MOVI backend",
  "database": "connected",
  "environment": "production",
  "timestamp": "2026-06-14T19:08:52.879Z"
}
```

| Campo | Significado |
|-------|-------------|
| `status: ok` | DB conectada |
| `status: degraded` | API arriba pero DB desconectada → revisar `DATABASE_URL` y migraciones |
| `database: connected` | PostgreSQL accesible |

---

## 7. Cómo obtener URL pública

### Railway

1. Servicio backend → **Settings → Networking**.
2. **Generate Domain** (si no existe).
3. Copia la URL HTTPS, p. ej. `https://movi-backend-production.up.railway.app`.
4. Configura `PUBLIC_URL` con esa URL en Variables.
5. Usa la misma URL en `EXPO_PUBLIC_API_URL` y `wss://.../ws` en `EXPO_PUBLIC_WS_URL`.

### Render

1. Dashboard del servicio `movi-backend` → URL en la parte superior.
2. Configura `PUBLIC_URL` con esa URL.

---

## Checklist final — despliegue Railway

**PASO 1** — Crear proyecto Railway.

**PASO 2** — Crear PostgreSQL (Add Service → Database → PostgreSQL).

**PASO 3** — Configurar variables en el servicio backend:

```env
NODE_ENV=production
DATABASE_URL=<desde PostgreSQL Railway>
JWT_SECRET=<string aleatorio largo>
CORS_ORIGIN=*
DEMO_OTP_CODE=123456
PUBLIC_URL=https://TU_DOMINIO.up.railway.app
STORAGE_MODE=local
```

**PASO 4** — Deploy (Root Directory = `backend`, usa Dockerfile + railway.json).

**PASO 5** — Ejecutar migraciones:

```bash
cd backend && railway run npm run db:migrate:deploy
```

**PASO 6** — Ejecutar seed:

```bash
cd backend && railway run npm run db:seed
```

**PASO 7** — Probar `/health`:

```bash
curl -s https://TU_URL/health
```

**PASO 8** — Configurar Expo en la raíz del repo:

```bash
cp .env.remote.example .env
# Editar EXPO_PUBLIC_API_URL y EXPO_PUBLIC_WS_URL con la URL real
# EXPO_PUBLIC_USE_MOCK_API=false
```

**PASO 9** — Ejecutar Expo tunnel:

```bash
npm install
npx expo start --tunnel
```

**PASO 10** — Probar desde teléfonos reales en El Salvador con Expo Go (escanear QR del tunnel).

---

## Validación local (referencia)

Comandos ejecutados en el repo (2026-06-14):

| Comando | Resultado |
|---------|-----------|
| `npm install` (raíz) | OK |
| `npm run build` (raíz) | **No existe script** — Expo Go no requiere build |
| `npm run typecheck` (raíz) | OK |
| `npm run build` (backend) | OK |
| `npm run prisma:validate` (backend) | OK |
| `npm run prisma:migrate:status` (backend) | OK (3 migraciones aplicadas) |
| `npm run db:seed` (backend) | OK |
| `curl /health` (backend local) | OK — `status: ok`, `database: connected` |
| `docker build` | **No verificado** — Docker no disponible en entorno CI local |
