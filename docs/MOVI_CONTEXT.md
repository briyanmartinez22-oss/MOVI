# MOVI — Contexto del proyecto

## Qué es MOVI

MOVI es una plataforma de movilidad multi-servicio orientada al mercado de **El Salvador**. Combina ride hailing, delivery, logística de carga, servicios para negocios y transporte especializado en un solo ecosistema móvil con panel administrativo web integrado en la misma app (Expo Web).

**Dominios de producto:**

| Vertical | Descripción |
|----------|-------------|
| Movilidad / Ride Hailing | Viajes inmediatos y programados (mototaxi, sedan, microbús, etc.) |
| Delivery | Entregas desde comercios registrados |
| Logística / Carga | Paquetes, carga, mudanzas, transporte de animales |
| Servicios | Transporte grupal, servicios para negocios |
| Flota propietaria | Owners registran vehículos, invitan o auto-asignan conductores |

**Mercado principal:** El Salvador (+503). Soporte secundario para números US (+1) en autenticación y QA.

**Estado actual:** Beta privada — backend en Railway, APK Android interno vía EAS, dashboard admin operativo, flujos core implementados pero con bugs críticos pendientes (ver `MOVI_OPEN_BUGS.md`).

---

## Stack tecnológico

### Frontend (monorepo raíz `/MOVI`)

| Tecnología | Versión / nota |
|------------|----------------|
| React Native | 0.81.5 |
| Expo | ~54.0.0 |
| Expo Router | ~6.0.23 (navegación file-based en `app/`) |
| TypeScript | ~5.9.2 |
| AsyncStorage | Sesión JWT local |
| EAS Build | APK preview + iOS preview |

**Estructura clave:**

```
MOVI/
├── app/                  # Rutas Expo Router (passenger, driver, owner, business, admin, auth)
├── src/
│   ├── components/       # UI compartida + admin/
│   ├── context/          # AuthContext, TripContext
│   ├── services/         # API client, auth, maps, push, realtime
│   ├── types/            # Modelos TypeScript frontend
│   └── utils/            # Helpers de negocio
├── backend/              # NestJS API (subdirectorio, no separado en otro repo)
└── docs/                 # Documentación técnica (este directorio)
```

### Backend (`/MOVI/backend`)

| Tecnología | Versión / nota |
|------------|----------------|
| Node.js | 22 (Dockerfile) |
| NestJS | 11.x |
| TypeScript | 5.9.x |
| Prisma ORM | 6.x |
| PostgreSQL | Producción (Railway) |
| JWT (`jsonwebtoken`) | Access token 1h |
| bcryptjs | Hash de contraseñas |
| Twilio Verify | OTP en producción |
| Cloudinary / S3 / local | Storage de documentos |
| Google Maps | Geocoding, rutas, distancias |
| Socket.IO + ws | Realtime (`/ws`) |
| Zod | Validación de inputs |

### Infraestructura

| Servicio | Uso |
|----------|-----|
| **GitHub** | `https://github.com/briyanmartinez22-oss/MOVI.git` |
| **Railway** | Backend API + PostgreSQL |
| **EAS (Expo)** | Builds Android APK / iOS |
| **Twilio Verify** | OTP SMS |
| **Google Maps** | Maps API |
| **Cloudinary** | Upload de documentos e fotos |

**URLs de producción:**

- API: `https://movi-production-ef3b.up.railway.app`
- WebSocket: `wss://movi-production-ef3b.up.railway.app/ws`
- Health: `https://movi-production-ef3b.up.railway.app/health`

---

## Roles de usuario (resumen)

| Rol MOVI | `UserRole` Prisma | Acceso |
|----------|-------------------|--------|
| Pasajero | `passenger` | App móvil — solicitar viajes |
| Conductor | `driver` | App móvil — ofertar y operar viajes |
| Propietario | `owner` | App móvil — gestionar flota |
| Comercio | `business` | App móvil — delivery |
| Admin / Staff | `admin` | Dashboard web (`/admin`) + staff roles granulares |

Detalle completo en `MOVI_ROLES_AND_PERMISSIONS.md`.

---

## Flujos de autenticación (resumen)

| Tipo de usuario | Registro | Login |
|-----------------|----------|-------|
| Pasajero / Owner / Driver / Business | Teléfono → OTP → contraseña | Teléfono + contraseña |
| SUPER_ADMIN / Staff admin | — | Teléfono → OTP → DUI (sin contraseña) |

Detalle en `MOVI_AUTH_SYSTEM.md`.

---

## Estado de preparación para beta

| Área | Estado |
|------|--------|
| Auth OTP Twilio | ✅ Producción |
| Login V2 (teléfono + contraseña) | ✅ Implementado, ⚠️ bugs en producción |
| Dashboard Admin | ✅ Operativo |
| Operaciones en vivo | ✅ Implementado |
| Maps / Geocoding | ✅ Google Maps |
| Railway deploy | ✅ Automatizado (Docker) |
| Android APK | ✅ EAS preview |
| iOS / TestFlight | ⏳ Pendiente |
| Push notifications | 🔶 Parcial (Expo Push configurado, QA pendiente) |
| Bugs críticos P0 | ❌ 3 abiertos |

---

## Documentos relacionados

| Archivo | Contenido |
|---------|-----------|
| `MOVI_ARCHITECTURE.md` | Arquitectura técnica y módulos |
| `MOVI_ROLES_AND_PERMISSIONS.md` | Roles y permisos granulares |
| `MOVI_AUTH_SYSTEM.md` | Auth, JWT, endpoints |
| `MOVI_DATABASE.md` | Modelos Prisma y relaciones |
| `MOVI_API_REFERENCE.md` | Rutas HTTP |
| `MOVI_DEPLOYMENT.md` | Deploy Railway, EAS, variables |
| `MOVI_COMPLETED_FEATURES.md` | Funcionalidades terminadas |
| `MOVI_OPEN_BUGS.md` | Bugs activos |
| `MOVI_NEXT_STEPS.md` | Prioridades |
| `CODEX_HANDOFF.md` | Handoff para Codex |

---

## Convenciones para colaboradores

1. **No modificar funcionalidad** sin ticket explícito — esta documentación es handoff, no sprint de features.
2. **Backend** vive en `MOVI/backend/` — no es un repo separado.
3. **Respuestas API** siempre envueltas: `{ ok: true, data }` o `{ ok: false, error, code? }` (excepto `/health`).
4. **Teléfonos** siempre normalizados a E.164: `+503XXXXXXXX` o `+1XXXXXXXXXX`.
5. **Prisma migrations** obligatorias en deploy (`prisma migrate deploy` en Dockerfile CMD).
6. **QA scripts** en `backend/scripts/` — ejecutar antes de merge a producción.
