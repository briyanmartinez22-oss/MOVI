# CODEX Handoff — MOVI

Documento de incorporación para Codex. Lee esto primero, luego los docs específicos según el área de trabajo.

**Repo:** `https://github.com/briyanmartinez22-oss/MOVI.git`  
**Prod API:** `https://movi-production-ef3b.up.railway.app`

---

## Qué es MOVI (30 segundos)

Plataforma de movilidad para El Salvador: ride hailing, delivery, logística. Monorepo Expo (React Native + Web admin) + NestJS backend en `backend/`. Beta privada en Railway.

---

## Qué está terminado

Ver `MOVI_COMPLETED_FEATURES.md` para lista completa. Highlights:

- Auth OTP Twilio + Login V2 password
- Dashboard admin completo (operations live, CRUD entities, finance, support, audit)
- Flujo viajes: request → offer → accept → lifecycle → complete
- Registro owner/driver/business/passenger
- Vehicle management + invites
- Google Maps, Cloudinary, Railway deploy, EAS Android APK
- QA script suite (20+ scripts)

---

## Qué está pendiente

Ver `MOVI_NEXT_STEPS.md`. Resumen:

| Prioridad | Items |
|-----------|-------|
| **P0** | Login owner, delete owner list filter, vehicle auto-reject |
| **P1** | TestFlight, push notifications E2E, QA beta privada |
| **P2** | Seguridad SUPER_ADMIN multicapa, analytics avanzados, ops center |

---

## Bugs críticos — NO ignorar

| Bug | Impacto | Archivo clave |
|-----|---------|---------------|
| **#1** Owner +50370328885 login | Beta blocker | `auth.service.ts`, `api/client.ts` |
| **#2** Owner delete reaparece | Admin broken | `admin.service.ts` `listAdminOwners()` |
| **#3** Vehículos auto-rechazados | Onboarding broken | `moviService.ts`, `repair-vehicle-status.ts` |

Detalle completo: `MOVI_OPEN_BUGS.md`

---

## Módulos que NO debes tocar (sin coordinación)

| Módulo | Razón |
|--------|-------|
| `src/theme/*` | Cursor maneja branding/UX |
| `app/onboarding/*` | Cursor maneja flujos UX registro |
| `src/components/help/*` | Help center en desarrollo UX |
| `src/services/demoSimulation/*` | Demo mode — no afecta prod |
| `src/services/mockApi/*` | Mock offline — no afecta prod |
| `app.json` / `eas.json` env vars | Cambios requieren rebuild APK — coordinar |
| `ensure-super-admin.service.ts` | Bootstrap crítico — no cambiar phone/DUI sin aviso |
| `beta-reset.service.ts` | Destructivo — solo SUPER_ADMIN manual |

---

## Módulos que puedes refactorizar libremente

| Módulo | Notas |
|--------|-------|
| `backend/src/services/auth.service.ts` | Login bugs P0 |
| `backend/src/services/admin-entity-actions.service.ts` | CRUD admin |
| `backend/src/services/admin.service.ts` | Listados admin — fix bug #2 aquí |
| `backend/src/services/moviService.ts` | Verificación vehículos — bug #3 |
| `backend/src/utils/phone.ts` | Normalización teléfono |
| `backend/src/utils/normalize.ts` | namesMatch, duiMatches |
| `backend/prisma/schema.prisma` | Solo con migration |
| `backend/src/services/admin-permissions.service.ts` | Permisos |
| `backend/src/services/otpService.ts` | OTP |
| `backend/src/services/audit.service.ts` | Auditoría |
| `backend/scripts/*` | QA scripts |
| `backend/src/common/guards/*` | Security guards |
| `backend/src/services/providerEligibility.service.ts` | Matching |

---

## División de trabajo Cursor + Codex

### Cursor trabaja en:

- UX y pantallas (`app/`, `src/components/`)
- Navegación y flujos (`expo-router`)
- Mensajes de error user-friendly
- Admin UI polish (`src/components/admin/`)
- Onboarding flows
- Help center
- Theme y branding
- Mejoras visuales Operations Live map

### Codex trabaja en:

- Auth backend (`auth.service.ts`, `auth.controller.ts`)
- Bugs P0 backend (login, delete filter, vehicle verification)
- Prisma schema y migrations
- Admin services (entity actions, vehicle actions)
- Seguridad (guards, lockout, audit)
- QA scripts y CI gate
- Railway/deploy issues
- API endpoints nuevos o fixes
- WebSocket / realtime backend

### Coordinación requerida

| Cambio | Quién avisa a quién |
|--------|---------------------|
| Nuevo endpoint API | Codex → Cursor (actualizar `src/services/api/`) |
| Cambio env vars EAS | Codex → Cursor (rebuild APK) |
| Cambio UI auth flow | Cursor → Codex (si cambia body de request) |
| Prisma migration | Codex avisa antes de deploy |
| Cambio permisos admin | Codex actualiza backend + Cursor actualiza `adminPermissions.ts` |

---

## Setup rápido Codex

```bash
# Clone
git clone https://github.com/briyanmartinez22-oss/MOVI.git
cd MOVI

# Backend
cd backend
docker compose up -d
cp .env.example .env
npm install
npm run db:migrate
npm run dev
# → http://localhost:3001/health

# Frontend (opcional para Codex)
cd ..
npm install
# EXPO_PUBLIC_USE_MOCK_API=true para demo sin backend
npm start
```

### QA contra producción

```bash
cd backend
API_URL=https://movi-production-ef3b.up.railway.app npm run qa:owner-login
API_URL=https://movi-production-ef3b.up.railway.app npm run qa:auth
API_URL=https://movi-production-ef3b.up.railway.app npm run qa:admin-entities
```

### Login admin local

- Teléfono: `+12144698637`
- OTP demo: `123456`
- DUI: `00000000-0`

---

## Convenciones obligatorias

1. **Respuestas API:** `{ ok: true, data }` / `{ ok: false, error, code? }`
2. **Teléfonos:** siempre normalizar con `normalizePhone()` antes de BD lookup
3. **Soft delete:** nunca hard delete users/owners/vehicles/drivers en prod
4. **Audit:** acciones admin sensibles → `writeAdminAudit()`
5. **No commits** sin solicitud explícita del usuario
6. **Migrations:** siempre `prisma migrate dev` local, `migrate deploy` en prod
7. **Tests:** ejecutar `npm run test:ci` antes de considerar fix completo

---

## Documentación de referencia

| Doc | Cuándo leer |
|-----|------------|
| `MOVI_CONTEXT.md` | Overview general |
| `MOVI_ARCHITECTURE.md` | Entender módulos y flujos |
| `MOVI_AUTH_SYSTEM.md` | Trabajar en auth |
| `MOVI_DATABASE.md` | Trabajar en Prisma/queries |
| `MOVI_API_REFERENCE.md` | Endpoints HTTP |
| `MOVI_ROLES_AND_PERMISSIONS.md` | Guards y permisos |
| `MOVI_DEPLOYMENT.md` | Deploy Railway/EAS |
| `MOVI_OPEN_BUGS.md` | Bugs activos |
| `MOVI_NEXT_STEPS.md` | Prioridades |

---

## Primer task sugerido para Codex

**Fix BUG #2** (más simple, fix claro):

En `backend/src/services/admin.service.ts`, función `listAdminOwners()`:

```typescript
const owners = await prisma.owner.findMany({
  where: {
    status: { not: 'deleted' },
    deletedAt: null,
  },
  // ...rest
});
```

Luego ejecutar `npm run qa:admin-entities` y verificar.

**Segundo task:** Fix BUG #1 con `qa:owner-login` contra producción + debug logs.

**Tercer task:** BUG #3 — auditar rejected vehicles + evaluar `namesMatch` flexibility.

---

## Contacto / escalación

- Cambios que requieren rebuild APK → avisar antes
- Cambios destructivos en BD → backup Railway PostgreSQL primero
- Si bug es frontend-only (mensaje "Sin conexión" incorrecto) → asignar a Cursor
