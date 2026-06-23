# MOVI — Sistema de autenticación

## Resumen por tipo de usuario

### Usuarios normales (passenger, owner, driver, business)

#### Registro

1. `POST /auth/request-otp` — envía OTP al teléfono (Twilio Verify en prod)
2. `POST /auth/verify-otp` — valida código OTP
   - Respuesta incluye `isNewUser`, `verificationToken`, `existingRole`
3. Registro específico por rol:
   - `POST /passengers/register`
   - `POST /owners/register` (requiere `password` en body)
   - `POST /drivers/register-with-invite`
   - `POST /businesses/register`
4. Alternativa post-OTP para usuarios sin contraseña:
   - `POST /auth/set-password` — OTP + nueva contraseña → login automático

#### Login

```
POST /auth/login
{
  "phone": "+50370328885",   // o "70328885", "50370328885"
  "password": "MiPass123"
}
```

#### Recuperación de contraseña

1. `POST /auth/forgot-password` — envía OTP (no revela si usuario existe)
2. `POST /auth/reset-password` — OTP + nueva contraseña + confirmación

---

### SUPER_ADMIN y staff admin

#### Login (sin contraseña)

```
POST /auth/login
{
  "phone": "+12144698637",
  "code": "123456",          // OTP de Twilio
  "dui": "00000000-0"        // REQUERIDO para admin
}
```

**Flujo interno:**

1. Si body tiene `password` → `loginWithPassword()` (rechaza `role=admin`)
2. Si body tiene `code` → `loginWithOtp()` en `moviService.ts` → delega a `loginWithOtpAdmin()`
3. Valida OTP vía Twilio/demo
4. Valida DUI contra `user.duiNumber` con `duiMatches()`
5. Emite JWT + refresh token

**Cuenta bootstrap:** Creada en cada startup por `ensureSuperAdmin()`:

| Campo | Valor default |
|-------|---------------|
| Teléfono | `+12144698637` |
| DUI | `00000000-0` (override: `SUPER_ADMIN_DUI` env) |
| Nombre | `MOVI Super Admin` |
| Staff role | `SUPER_ADMIN` |

#### Dashboard

Acceso web en rutas `app/admin/*`. Requiere JWT con `role: admin` en AsyncStorage.

---

## Endpoints de autenticación

Base: `https://movi-production-ef3b.up.railway.app`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/request-otp` | No | Solicitar OTP SMS |
| POST | `/auth/verify-otp` | No | Verificar OTP |
| POST | `/auth/login` | No | Login password o OTP admin |
| POST | `/auth/forgot-password` | No | OTP para recuperación |
| POST | `/auth/reset-password` | No | Reset con OTP |
| POST | `/auth/set-password` | No | Primera contraseña post-OTP |
| POST | `/auth/refresh` | No | Rotar refresh token |
| GET | `/auth/me` | JWT | Usuario actual |
| POST | `/auth/me/photo` | JWT | Actualizar foto perfil |
| POST | `/auth/logout` | No | Revocar refresh token |

### Request / Response examples

#### request-otp

```json
// POST /auth/request-otp
{ "phone": "70328885" }

// Response 200
{ "ok": true, "data": { "sent": true } }
```

#### verify-otp

```json
// POST /auth/verify-otp
{ "phone": "+50370328885", "code": "123456" }

// Response 200
{
  "ok": true,
  "data": {
    "verified": true,
    "isNewUser": false,
    "verificationToken": "eyJ...",
    "existingRole": "owner"
  }
}
```

#### login (password)

```json
// POST /auth/login
{ "phone": "+50370328885", "password": "MiPass123" }

// Response 200
{
  "ok": true,
  "data": {
    "user": { "userId": "...", "role": "owner", "phoneNumber": "+50370328885", ... },
    "authToken": "eyJ...",
    "refreshToken": "..."
  }
}
```

#### login (admin OTP)

```json
// POST /auth/login
{ "phone": "+12144698637", "code": "123456", "dui": "00000000-0" }

// Response 200 — user incluye staffRole: "SUPER_ADMIN"
```

#### Errores de login comunes

| Error | Code | HTTP |
|-------|------|------|
| Teléfono o contraseña incorrectos | — | 400 |
| Debes crear una contraseña antes de iniciar sesión | `SET_PASSWORD_REQUIRED` | 400 |
| Las cuentas administrativas usan verificación OTP | `ADMIN_OTP_REQUIRED` | 400 |
| Demasiados intentos fallidos | `LOGIN_LOCKED` | 400 |
| Número de teléfono inválido | `INVALID_PHONE` | 400 |
| El DUI no coincide | — | 400 |
| Token inválido o expirado | — | 401 |

---

## JWT

### Access token (`authToken`)

| Propiedad | Valor |
|-----------|-------|
| Librería | `jsonwebtoken` |
| Secret | `JWT_SECRET` env |
| TTL | **1 hora** (`ACCESS_TTL = '1h'`) |
| Payload | `{ userId: string, role: string }` |
| Header | `Authorization: Bearer <token>` |

Implementación: `backend/src/lib/jwt.ts`

### Refresh token

| Propiedad | Valor |
|-----------|-------|
| Storage | Tabla `RefreshToken` (hash, no plaintext) |
| Rotación | `POST /auth/refresh` revoca anterior y emite nuevo |
| Revocación | Logout, reset password, suspend |

### OTP verification token

| Propiedad | Valor |
|-----------|-------|
| TTL | 15 minutos |
| Payload | `{ phone, purpose: 'otp-verified' }` |
| Uso | Flujos de registro intermedios |

---

## Normalización telefónica

Implementación: `backend/src/utils/phone.ts` y `backend/src/utils/normalize.ts`

### Formato canónico

| Región | Formato | Ejemplo |
|--------|---------|---------|
| El Salvador | `+503` + 8 dígitos | `+50370328885` |
| US | `+1` + 10 dígitos | `+12144698637` |

### Inputs aceptados → canónico

| Input | Resultado |
|-------|-----------|
| `70328885` | `+50370328885` |
| `0770328885` | `+50370328885` (quita trunk 0) |
| `50370328885` | `+50370328885` |
| `+50370328885` | `+50370328885` |
| `2144698637` | `+12144698637` |

### Lookup con variantes legacy

`findUserByPhone()` en `ensure-super-admin.service.ts` busca por variantes:

- Canónico E.164
- Solo dígitos locales (`70328885`)
- Con prefijo sin `+` (`50370328885`)
- Con trunk 0 (`0770328885`)

Esto evita duplicados pero puede causar inconsistencias si datos legacy no fueron migrados.

### Validación en controllers

Todos los endpoints auth usan Zod transform:

```typescript
phoneSchema = z.string().transform(normalizePhone).refine(isValidMoviPhone)
```

---

## Contraseñas

| Regla | Validación |
|-------|------------|
| Mínimo 8 caracteres | Zod + `password.service.ts` |
| Al menos 1 letra | Regex `/[a-zA-Z]/` |
| Al menos 1 número | Regex `/\d/` |
| Hash | bcryptjs |

Admin **no puede** usar contraseña — `loginWithPassword` rechaza `role === 'admin'`.

---

## OTP

| Modo | Cuándo | Código |
|------|--------|--------|
| Twilio Verify | Producción (`OTP_PROVIDER=twilio`) | SMS real |
| Demo | Dev (`DEMO_OTP_ENABLED=true`) | `123456` (default) |

Variables Twilio:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

Tabla `OtpChallenge` almacena challenges locales (modo demo / fallback).

---

## Login lockout

- Tras intentos fallidos de password → lockout 15 minutos por teléfono
- Implementación: `login-lockout.service.ts`
- Mensaje genérico para no revelar existencia de cuenta: "Teléfono o contraseña incorrectos"

---

## Sesión frontend

Almacenada en AsyncStorage (`src/services/authService.ts`):

| Key | Contenido |
|-----|-----------|
| `movi_session_authToken` | JWT access |
| `movi_session_refreshToken` | Refresh token |
| `movi_session_currentUser` | JSON AuthUser |
| `movi_session_role` | Rol string |
| `movi_session_phoneNumber` | Teléfono |

Post-login: conecta WebSocket, sync push token, cachea perfiles.

---

## Manejo de errores de red (frontend)

`src/services/api/client.ts`:

- Timeout auth: 20s, otros: 12s
- Error de red → `code: NETWORK_ERROR`, mensaje incluye URL del backend
- **Importante:** HTTP 400 del servidor NO es error de red — se parsea `error` del JSON
- Si el usuario ve "Sin conexión" con URL del backend, es `NETWORK_ERROR` (fetch falló o timeout), no un 401/400

Debug: activar `AUTH_LOGIN_DEBUG=1` en Railway para logs de lookup de teléfono/password.
