# MOVI — Bugs abiertos

Bugs activos documentados con estado, hipótesis e investigación actual basada en código fuente.

---

## BUG #1 — Owner +50370328885 no puede hacer login

| Campo | Valor |
|-------|-------|
| **Usuario** | Owner Adalid — `+50370328885` |
| **Estado** | 🔴 Pendiente (P0) |
| **Error mostrado** | `"Sin conexión (https://movi-production-ef3b.up.railway.app)"` o variante con URL del backend |

### Descripción

El owner no puede iniciar sesión con teléfono + contraseña. El mensaje de error sugiere fallo de red, no un error de autenticación explícito.

### Hipótesis

| # | Hipótesis | Evidencia en código |
|---|-----------|---------------------|
| 1 | **`passwordHash` null** en BD | `loginWithPassword()` retorna `SET_PASSWORD_REQUIRED` si user existe sin hash — pero esto sería HTTP 400 con mensaje claro, no "Sin conexión" |
| 2 | **Normalización teléfono** | `findUserByPhone()` busca variantes; si teléfono en BD no coincide con ninguna variante, login falla genérico |
| 3 | **Frontend interpreta error como network** | `api/client.ts` solo muestra "Sin conexión" cuando `isNetworkFailure()` o `AbortError` — **no** cuando HTTP 400 |
| 4 | **Deploy incompleto** | Login V2 (password branch en `/auth/login`) no desplegado → body con password retorna "Datos de login inválidos" (400), no network error |
| 5 | **Timeout real** | Auth timeout 20s; Railway cold start o latencia desde El Salvador podría causar AbortError |
| 6 | **APK con URL incorrecta** | APK viejo sin `EXPO_PUBLIC_API_URL` → `API_URL_MISSING` o fetch a URL inválida |

### Investigación actual

**Script QA dedicado:** `backend/scripts/owner-login-qa-e2e.ts`

```bash
API_URL=https://movi-production-ef3b.up.railway.app npm run qa:owner-login
```

El script verifica:

- Health del backend
- Login con formatos: `70328885`, `50370328885`, `+50370328885`
- Si Login V2 está desplegado (no retorna "Datos de login inválidos")
- Contraseña incorrecta → mensaje claro
- Desde admin: owner en lista con `hasPasswordHash`

**Debug en Railway:** Activar `AUTH_LOGIN_DEBUG=1` para logs:

```
[auth/login] password attempt { phoneInput, phoneNormalized }
[auth/login] lookup { userFound, hasPasswordHash, role }
[auth/login] password match { passwordMatch }
```

**Frontend error path** (`src/services/api/client.ts` líneas 136-146):

```
NETWORK_ERROR → "No se pudo conectar al servidor. Verifica tu red. Backend: <url>"
```

Si el usuario ve exactamente este mensaje con la URL de Railway, el `fetch()` falló antes de recibir HTTP response.

### Pasos para resolver

1. Ejecutar `qa:owner-login` contra producción
2. Verificar en admin panel si owner tiene `hasPasswordHash: true`
3. Query BD: `SELECT phoneNumber, passwordHash IS NOT NULL FROM User WHERE phoneNumber LIKE '%70328885%'`
4. Si hash null → `trigger-password-reset` desde admin o `set-password` flow
5. Si hash existe → verificar contraseña con debug logs
6. Confirmar APK actual con EAS build reciente
7. Test desde El Salvador con red móvil vs WiFi

---

## BUG #2 — Eliminar owner desde SuperAdmin reaparece

| Campo | Valor |
|-------|-------|
| **Módulo** | Admin → Owners |
| **Estado** | 🔴 Pendiente (P0) |
| **Acción** | DELETE owner desde dashboard |

### Descripción

Al eliminar un owner desde SuperAdmin, el owner reaparece en la lista tras refresh.

### Hipótesis

| # | Hipótesis | Evidencia en código |
|---|-----------|---------------------|
| 1 | **Soft delete incorrecto en listado** | ✅ **CONFIRMADO** — `listAdminOwners()` en `admin.service.ts` NO filtra `status=deleted` ni `deletedAt` |
| 2 | **Refresh incorrecto** | Frontend `load()` llama `fetchAdminOwners()` que trae todos los owners incluyendo deleted |
| 3 | **Endpoint DELETE no persiste** | ❌ Probablemente funciona — `deleteAdminOwner()` setea `status='deleted'`, `deletedAt` |

### Investigación actual

**Delete implementación** (`admin-entity-actions.service.ts`):

```typescript
await prisma.owner.update({
  where: { id: ownerId },
  data: {
    status: 'deleted',
    deletedAt: new Date(),
    deletedBy: ctx.adminUserId,
  },
});
// Retorna { deleted: true, soft: true }
// NO elimina User row
```

**List implementación** (`admin.service.ts`):

```typescript
const owners = await prisma.owner.findMany({
  include: { user: true, vehicles: true, drivers: true },
  orderBy: { createdAt: 'desc' },
  take: 200,
  // ⚠️ SIN filtro: where: { status: { not: 'deleted' } }
});
```

**Restricción delete:** Si owner tiene vehículos activos (`approved`, `under_review`, `documents_uploaded`), delete retorna error y no persiste.

**Frontend** (`app/admin/owners.tsx`): Tras delete exitoso, `useAdminEntityActions` llama `load()` que refetch la lista completa.

### Fix esperado

Agregar filtro en `listAdminOwners()`:

```typescript
where: { status: { not: 'deleted' }, deletedAt: null }
```

O mapear `mvpStatus` para owners deleted y filtrar en frontend.

### Pasos para resolver

1. Confirmar que DELETE retorna 200 con `{ deleted: true, soft: true }`
2. Query BD post-delete: verificar `status='deleted'` y `deletedAt` set
3. Si persiste pero reaparece → fix `listAdminOwners` filter
4. Si DELETE falla silenciosamente → verificar vehículos activos del owner

---

## BUG #3 — Vehículos rechazados automáticamente

| Campo | Valor |
|-------|-------|
| **Módulo** | Verificación de vehículos |
| **Estado** | 🔴 Pendiente (P0) |

### Descripción

Vehículos enviados a verificación aparecen como rechazados sin intervención explícita del admin.

### Hipótesis

| # | Hipótesis | Evidencia en código |
|---|-----------|---------------------|
| 1 | **Comparación estricta de nombres** | `namesMatch()` requiere igualdad exacta (normalizada) entre `owner.name` y `registrationName` — si no coincide → status `incomplete` (no `rejected`) |
| 2 | **Datos legacy con status `rejected`** | Vehículos antiguos en BD con `rejected` antes de fix de auto-reject |
| 3 | **`autoRejected` flag legacy** | Columna `autoRejected` agregada en migration `20260623110000` — datos previos pueden tener `rejected` + `autoRejected=true` |
| 4 | **Admin reject automático en otro path** | Revisar si hay cron o script que rechaza |

### Investigación actual

**Submit verification** (`moviService.submitVehicleVerification()`):

- Documentos faltantes → `incomplete` (no `rejected`)
- Nombre tarjeta no coincide → `incomplete` con `autoRejected: false`
- Éxito → `under_review`

**No hay auto-reject a `rejected`** en el flujo actual de submit.

**Script de reparación existente:** `backend/scripts/repair-vehicle-status.ts`

```bash
npm run db:repair-vehicle-status        # simulación
npm run db:repair-vehicle-status -- --confirm  # aplicar
```

Detecta vehículos `rejected` con patrones de auto-reject:

- `autoRejected: true`
- `rejectReason` null
- Patrones: "no coincide con el DUI", "Unidad rechazada", "tarjeta de circulación no coincide"

Repara moviendo a `under_review`.

**Admin list** filtra `status: { not: 'deleted' }` pero muestra `rejected` correctamente.

### Pasos para resolver

1. Query vehículos afectados:
   ```sql
   SELECT plateNumber, status, rejectReason, autoRejected, registrationName
   FROM Vehicle WHERE status = 'rejected' ORDER BY updatedAt DESC;
   ```
2. Comparar `owner.name` vs `registrationName` para casos con razón de nombre
3. Ejecutar `repair-vehicle-status` en simulación
4. Si casos nuevos siguen apareciendo post-submit → revisar si hay otro code path
5. Considerar `namesMatch` más flexible (contains, fuzzy) para nombres salvadoreños

---

## Bugs menores / observaciones

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| B4 | README_BACKEND menciona SQLite dev pero schema es PostgreSQL-only | P2 |
| B5 | Expo AGENTS.md referencia v56 pero package usa Expo 54 | P2 |
| B6 | Push notifications configurado pero QA push pendiente en prod | P1 |

---

## Cómo reportar nuevos bugs

1. Agregar entrada en este archivo con formato BUG #N
2. Incluir: usuario/módulo, error exacto, hipótesis, evidencia de código
3. Crear script QA en `backend/scripts/` si es reproducible
4. Referenciar en `MOVI_NEXT_STEPS.md` con prioridad
