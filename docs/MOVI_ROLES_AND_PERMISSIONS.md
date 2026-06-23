# MOVI — Roles y permisos

## Modelo de roles

MOVI usa dos niveles de roles:

1. **`UserRole`** (Prisma enum) — rol principal de la cuenta en la app móvil.
2. **`AdminStaffRole`** (Prisma enum) — sub-rol granular para usuarios con `UserRole = admin` en el dashboard.

---

## Roles de aplicación (`UserRole`)

### PASSENGER (`passenger`)

**Quién:** Usuarios que solicitan viajes y deliveries como clientes.

| Acción | Permitido |
|--------|-----------|
| Registro (OTP + contraseña) | ✅ |
| Login teléfono + contraseña | ✅ |
| Solicitar viaje inmediato / programado | ✅ |
| Ver historial de viajes | ✅ |
| Chat con conductor durante viaje | ✅ |
| Cancelar viaje | ✅ |
| Rating post-viaje | ✅ |
| Dashboard admin | ❌ |

**Rutas app:** `app/passenger/`

---

### DRIVER (`driver`)

**Quién:** Conductores que operan vehículos de la flota MOVI.

| Acción | Permitido |
|--------|-----------|
| Registro vía código de invitación del owner | ✅ |
| Login teléfono + contraseña | ✅ |
| Iniciar/finalizar sesión online (`DriverSession`) | ✅ |
| Ver y ofertar viajes disponibles | ✅ |
| Aceptar ofertas, avanzar lifecycle del viaje | ✅ |
| Chat con pasajero | ✅ |
| Gestionar suscripción ($7 USD/mes) | ✅ |
| Registrar vehículo propio | ❌ (asignado por owner) |
| Dashboard admin | ❌ |

**Estados de verificación:** `pending` → `approved` / `rejected` / `suspended` / `deleted`

**Rutas app:** `app/driver/`

---

### OWNER (`owner`)

**Quién:** Propietarios de flota que registran vehículos y gestionan conductores.

| Acción | Permitido |
|--------|-----------|
| Registro (OTP + contraseña + DUI) | ✅ |
| Login teléfono + contraseña | ✅ |
| Registrar vehículos | ✅ |
| Subir documentos de vehículo y owner | ✅ |
| Enviar vehículo a verificación | ✅ |
| Crear invitaciones para conductores | ✅ |
| Auto-asignarse como conductor (`self-assign-driver`) | ✅ |
| Ver/cancelar/regenerar invitaciones | ✅ |
| Dashboard admin | ❌ |

**Estados de verificación owner:** `pending` → `documents_uploaded` → `under_review` → `approved` / `rejected` / `suspended` / `deleted`

**Rutas app:** `app/owner/`

---

### BUSINESS (`business`)

**Quién:** Comercios que usan MOVI para deliveries.

| Acción | Permitido |
|--------|-----------|
| Registro con ubicación, NIT, DUI responsable | ✅ |
| Login teléfono + contraseña | ✅ |
| Solicitar deliveries | ✅ |
| Ver historial de entregas | ✅ |
| Dashboard admin | ❌ |

**Estados:** `pending` → `approved` / `rejected` / `suspended`

**Rutas app:** `app/business/`

---

### ADMIN / STAFF (`admin`)

**Quién:** Personal MOVI con acceso al dashboard web (`/admin`). El rol `admin` en Prisma es el gate; los permisos reales dependen del `AdminStaffRole`.

**Login:** OTP + DUI (sin contraseña). Ver `MOVI_AUTH_SYSTEM.md`.

**Dashboard:** Acceso vía `app/admin/` con `AdminRouteGuard` + permisos granulares.

---

## Roles de staff admin (`AdminStaffRole`)

### SUPER_ADMIN

**Acceso:** Total — bypass de toda la matriz de permisos.

| Área | Acciones |
|------|----------|
| Usuarios | Ver, editar, suspender, eliminar, impersonar, cambiar rol |
| Pasajeros / Drivers / Owners / Businesses | Todas las acciones |
| Vehículos | Aprobar, rechazar, suspender, eliminar |
| Viajes | Ver, cancelar, reasignar, dispatch |
| Finanzas | Transacciones, suscripciones, refunds |
| Soporte | Tickets completo |
| Seguridad | Eventos, audit, suspend |
| Analytics | Full + export |
| Config | OTP, maps, storage, providers, comisiones |
| Sistema | Seeds, beta reset, Railway, DB, WebSocket |
| Admins | Crear, editar, eliminar staff |

**Teléfono bootstrap:** `+12144698637` (creado automáticamente en startup).

---

### OPS_ADMIN

**Enfoque:** Operaciones diarias — viajes, dispatch, monitoreo.

| Permiso | ✅/❌ |
|---------|------|
| `trips.view_all`, `trips.reassign`, `trips.cancel`, `trips.tracking` | ✅ |
| `trips.change_status`, `trips.chat` | ✅ |
| `deliveries.reassign`, `deliveries.cancel` | ✅ |
| `passengers.view`, `passengers.edit` | ✅ |
| `drivers.view`, `drivers.change_status` | ✅ |
| `businesses.view`, `businesses.deliveries` | ✅ |
| `owners.view` (solo lectura) | ✅ |
| Eliminar usuarios / owners | ❌ |
| Finanzas / config sistema | ❌ |

**Rutas dashboard:** Operations Live, Trips, Passengers, Drivers, Deliveries, Providers

---

### COMPLIANCE_ADMIN

**Enfoque:** Verificación de identidad, documentos, aprobaciones.

| Permiso | ✅/❌ |
|---------|------|
| `owners.view`, `owners.approve`, `owners.fleet` | ✅ |
| `drivers.view`, `drivers.approve`, `drivers.documents` | ✅ |
| `drivers.suspend` | ✅ |
| `businesses.approve`, `businesses.suspend` | ✅ |
| `passengers.force_verify` | ✅ |
| `users.view_all`, `users.edit`, `users.suspend` | ✅ |
| `security.events`, `security.audit`, `security.suspend` | ✅ |
| Eliminar entidades | ❌ (solo SUPER_ADMIN) |
| Finanzas / dispatch | ❌ |

**Rutas dashboard:** Owners, Drivers, Businesses, Verifications, Security, Audit

---

### SUPPORT_ADMIN

**Enfoque:** Soporte al usuario.

| Permiso | ✅/❌ |
|---------|------|
| `support.tickets_view`, `support.tickets_reply` | ✅ |
| `support.tickets_close`, `support.tickets_reopen` | ✅ |
| `trips.chat` | ✅ |
| `users.view_profile` | ✅ |
| Aprobar / eliminar entidades | ❌ |

**Rutas dashboard:** Support, Trips (chat)

---

### FINANCE_ADMIN

**Enfoque:** Finanzas y suscripciones.

| Permiso | ✅/❌ |
|---------|------|
| `finance.transactions`, `finance.subscriptions` | ✅ |
| `finance.revenue`, `finance.reports`, `finance.refunds` | ✅ |
| `analytics.full`, `analytics.export` | ✅ |
| `owners.reports`, `drivers.earnings` | ✅ |
| `passengers.ratings` | ✅ |
| Operaciones / verificación | ❌ |

**Rutas dashboard:** Finance, Subscriptions, Analytics

---

## STAFF (concepto general)

En documentación de producto, **STAFF** = cualquier usuario `admin` con un `AdminStaffRole` asignado en `AdminStaffProfile`. No es un enum Prisma separado.

| Staff role | Alias producto |
|------------|----------------|
| `SUPER_ADMIN` | Super Admin |
| `OPS_ADMIN` | Operaciones |
| `COMPLIANCE_ADMIN` | Compliance / Verificación |
| `SUPPORT_ADMIN` | Soporte |
| `FINANCE_ADMIN` | Finanzas |

---

## Guards del backend

| Guard | Valida |
|-------|--------|
| `JwtAuthGuard` | Bearer JWT válido |
| `RolesGuard` | `UserRole` del token vs `@Roles()` decorator |
| `AdminStaffGuard` | `AdminStaffRole` vs `@AdminStaffRoles()` o `@RequirePermission()` |

Implementación: `backend/src/common/guards/` y `backend/src/services/admin-permissions.service.ts`.

---

## Guards del frontend

| Componente | Valida |
|------------|--------|
| `AdminRouteGuard` | Rol admin + permiso para ruta |
| `AuthContext` | Sesión activa para rutas protegidas |

Config de rutas admin: `src/config/adminPermissions.ts` — cada entrada del sidebar tiene `permission` y `roles` requeridos.

---

## Multi-rol

`UserRoleAssignment` permite asignaciones adicionales de rol, pero en la práctica cada usuario tiene un `UserRole` principal. El token JWT incluye solo el rol principal.

---

## Matriz de acceso al dashboard

| Módulo dashboard | SUPER | OPS | COMPLIANCE | SUPPORT | FINANCE |
|------------------|-------|-----|------------|---------|---------|
| Home / KPIs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operations Live | ✅ | ✅ | ❌ | ❌ | ❌ |
| Trips | ✅ | ✅ | ❌ | chat | ❌ |
| Passengers | ✅ | ✅ | ❌ | view | ❌ |
| Drivers | ✅ | ✅ | ✅ | ❌ | earnings |
| Owners | ✅ | view | ✅ | ❌ | reports |
| Vehicles | ✅ | ❌ | ✅ | ❌ | ❌ |
| Businesses | ✅ | ✅ | ✅ | ❌ | ❌ |
| Deliveries | ✅ | ✅ | ❌ | ❌ | ❌ |
| Finance | ✅ | ❌ | ❌ | ❌ | ✅ |
| Subscriptions | ✅ | ❌ | ❌ | ❌ | ✅ |
| Support | ✅ | ❌ | ❌ | ✅ | ❌ |
| Security | ✅ | ❌ | ✅ | ❌ | ❌ |
| Audit | ✅ | ❌ | ✅ | ❌ | ❌ |
| Analytics | ✅ | ❌ | ❌ | ❌ | ✅ |
| Integrations | ✅ | ❌ | ❌ | ❌ | ❌ |
| System Tools | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admins | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
