# MOVI — Referencia API

## Convenciones

| Propiedad | Valor |
|-----------|-------|
| Base URL (prod) | `https://movi-production-ef3b.up.railway.app` |
| Formato respuesta OK | `{ "ok": true, "data": { ... } }` |
| Formato error | `{ "ok": false, "error": "mensaje", "code?": "CODE" }` |
| Auth header | `Authorization: Bearer <authToken>` |
| Excepción | `GET /health` — respuesta directa sin wrapper |

### Status codes

| Code | Cuándo |
|------|--------|
| **200** | Éxito (body con `ok: true`) |
| **400** | Validación, negocio, login fallido |
| **401** | JWT inválido/expirado, refresh token inválido |
| **403** | Rol/permiso insuficiente (guards) |
| **404** | Recurso no encontrado |
| **500** | Error interno (`ok: false`) |

---

## Health

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |

```json
{ "status": "ok", "service": "MOVI backend" }
```

---

## Auth

| Método | Ruta | Auth | Body | Descripción |
|--------|------|------|------|-------------|
| POST | `/auth/request-otp` | No | `{ phone }` | Enviar OTP |
| POST | `/auth/verify-otp` | No | `{ phone, code }` | Verificar OTP |
| POST | `/auth/login` | No | `{ phone, password }` o `{ phone, code, dui? }` | Login |
| POST | `/auth/forgot-password` | No | `{ phone }` | OTP recuperación |
| POST | `/auth/reset-password` | No | `{ phone, code, password, confirmPassword }` | Reset password |
| POST | `/auth/set-password` | No | `{ phone, code, password, confirmPassword }` | Primera contraseña |
| POST | `/auth/refresh` | No | `{ refreshToken }` | Rotar tokens |
| GET | `/auth/me` | JWT | — | Usuario actual |
| POST | `/auth/me/photo` | JWT | `{ profilePhoto }` | Foto perfil |
| POST | `/auth/logout` | No | `{ refreshToken? }` | Logout |

---

## Passengers

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/passengers/register` | No | Registro pasajero post-OTP |

---

## Owners

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/owners/register` | No | Registro owner + password |
| POST | `/owners/upload-documents` | JWT | Upload docs owner |
| POST | `/owners/submit-verification` | JWT | Enviar verificación |
| POST | `/owners/me/self-assign-driver` | JWT | Owner → conductor |
| GET | `/owners/me/vehicle-invites` | JWT | Listar invitaciones |
| POST | `/owners/me/vehicle-invites/:inviteId/cancel` | JWT | Cancelar invite |
| POST | `/owners/me/vehicle-invites/:inviteId/regenerate` | JWT | Regenerar invite |

---

## Vehicles

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/vehicles/check-plate/:plate` | JWT | Verificar placa disponible |
| POST | `/vehicles/register` | JWT | Registrar vehículo |
| POST | `/vehicles/:vehicleId/upload-documents` | JWT | Upload docs vehículo |
| POST | `/vehicles/:vehicleId/submit-verification` | JWT | Enviar a revisión |
| POST | `/vehicles/:vehicleId/invite-driver` | JWT | Crear invite conductor |

---

## Drivers

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/drivers/invites/validate` | No | Validar código invite |
| GET | `/drivers/invites/:code/preview` | No | Preview invite |
| POST | `/drivers/register-with-invite` | No | Registro conductor |
| POST | `/drivers/:driverId/sessions/start` | JWT | Iniciar sesión online |
| POST | `/drivers/:driverId/sessions/end` | JWT | Finalizar sesión |
| GET | `/drivers/:driverId/sessions` | JWT | Historial sesiones |
| GET | `/drivers` | JWT | Listar (admin context) |
| POST | `/drivers/:inviteId/revoke` | JWT | Revocar invite |
| POST | `/drivers/:inviteId/cancel` | JWT | Cancelar invite |
| POST | `/drivers/:inviteId/extend` | JWT | Extender invite |
| POST | `/drivers/:inviteId/regenerate` | JWT | Regenerar invite |

---

## Businesses

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/businesses/register` | No | Registro comercio |

---

## Trips

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/trips/history` | JWT | Historial viajes |
| POST | `/trips/request` | JWT | Crear solicitud |
| GET | `/trips/available` | JWT | Viajes disponibles (driver) |
| GET | `/trips/available/scheduled` | JWT | Programados disponibles |
| GET | `/trips/reservations` | JWT | Reservas del driver |
| GET | `/trips/:tripId` | JWT | Detalle viaje |
| POST | `/trips/:tripId/offers` | JWT | Crear oferta |
| POST | `/trips/:tripId/offers/:offerId/accept` | JWT | Aceptar oferta |
| PATCH | `/trips/:tripId/lifecycle` | JWT | Avanzar lifecycle |
| POST | `/trips/:tripId/cancel` | JWT | Cancelar viaje |
| POST | `/trips/complete` | JWT | Completar viaje |

---

## Users

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/users/me/profiles` | JWT | Perfiles user/owner/driver/business |
| GET | `/users/me/roles` | JWT | Roles asignados |
| GET | `/users/me/vehicles` | JWT | Vehículos del owner |
| GET | `/users/:userId/ratings` | JWT | Ratings de usuario |

---

## Chat

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/chat/:tripId/chat` | JWT | Mensajes del viaje |

---

## Ratings

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/ratings/:tripId/ratings` | JWT | Crear rating |
| GET | `/ratings/:tripId/ratings` | JWT | Ver ratings |

---

## Subscriptions

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/subscriptions/me` | JWT | Suscripción del driver |
| POST | `/subscriptions/pay` | JWT | Pagar suscripción |

---

## Notifications

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/notifications/push-token` | JWT | Registrar push token |
| GET | `/notifications` | JWT | Listar notificaciones |
| POST | `/notifications/:id/read` | JWT | Marcar leída |
| POST | `/notifications/test` | JWT | Test push |

---

## Locations / Integrations

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/locations/demand-zones` | JWT | Zonas de demanda |
| GET | `/locations/geocode` | JWT | Geocoding |
| GET | `/locations/reverse` | JWT | Reverse geocoding |
| POST | `/locations/distance` | JWT | Calcular distancia |
| POST | `/locations/route` | JWT | Calcular ruta |
| GET | `/integrations/status` | JWT | Estado integraciones |
| GET | `/integrations/cloudinary/test` | JWT | Test Cloudinary |
| GET | `/integrations/maps/test` | JWT | Test Maps |

---

## Uploads

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/uploads` | JWT | Upload multipart |

---

## Analytics

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| GET | `/analytics/kpis` | JWT | admin | KPIs ejecutivos |
| GET | `/analytics/verifications/pending` | JWT | admin | Pendientes verificación |
| GET | `/analytics/metrics/summary` | JWT | admin | Resumen métricas |
| GET | `/analytics/metrics/providers` | JWT | admin | Métricas providers |
| GET | `/analytics/metrics/trips` | JWT | admin | Métricas viajes |
| GET | `/analytics/metrics/ratings` | JWT | admin | Métricas ratings |
| GET | `/analytics/metrics/subscriptions` | JWT | admin | Métricas suscripciones |
| GET | `/analytics/metrics/recent-activity` | JWT | admin | Actividad reciente |

---

## Admin — General

Requiere: JWT + `role=admin` + staff role/permiso adecuado.

| Método | Ruta | Staff roles | Descripción |
|--------|------|-------------|-------------|
| GET | `/admin/me` | admin | Perfil admin actual |
| GET | `/admin/providers` | OPS | Listar providers |
| GET | `/admin/trips` | OPS | Listar viajes admin |
| GET | `/admin/requests` | OPS | Solicitudes pendientes |
| GET | `/admin/drivers` | OPS | Listar conductores |
| GET | `/admin/passengers` | OPS | Listar pasajeros |
| GET | `/admin/vehicles` | COMPLIANCE | Listar vehículos |
| GET | `/admin/ratings` | admin | Ratings admin |

---

## Admin — Super / Listados

| Método | Ruta | Staff roles | Descripción |
|--------|------|-------------|-------------|
| GET | `/admin/owners` | SUPER, OPS, COMPLIANCE | Listar owners |
| GET | `/admin/businesses` | SUPER, OPS, COMPLIANCE | Listar comercios |
| GET | `/admin/deliveries` | SUPER, OPS | Listar deliveries |
| GET | `/admin/subscriptions` | SUPER, FINANCE | Listar suscripciones |
| GET | `/admin/admins` | SUPER | Listar staff admin |
| GET | `/admin/system/data-summary` | SUPER | Resumen datos plataforma |
| POST | `/admin/system/reset-beta` | SUPER | Reset beta (destructivo) |
| GET | `/admin/system/status` | SUPER | Estado sistema |
| POST | `/admin/users/:userId/impersonate` | SUPER | Impersonar usuario |

---

## Admin — Entity actions

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/admin/passengers/:id` | passengers.view | Detalle pasajero |
| PATCH | `/admin/passengers/:id` | passengers.edit | Editar pasajero |
| POST | `/admin/passengers/:id/suspend` | passengers.edit | Suspender |
| POST | `/admin/passengers/:id/reactivate` | passengers.edit | Reactivar |
| DELETE | `/admin/passengers/:id` | passengers.delete | Eliminar |
| POST | `/admin/drivers/:driverId/approve` | drivers.approve | Aprobar conductor |
| POST | `/admin/drivers/:driverId/reject` | drivers.approve | Rechazar |
| POST | `/admin/drivers/:driverId/suspend` | drivers.suspend | Suspender |
| POST | `/admin/drivers/:driverId/reactivate` | drivers.suspend | Reactivar |
| DELETE | `/admin/drivers/:driverId` | drivers.delete | Eliminar |
| POST | `/admin/owners/:ownerId/approve` | owners.approve | Aprobar owner |
| POST | `/admin/owners/:ownerId/reject` | owners.approve | Rechazar |
| POST | `/admin/owners/:ownerId/suspend` | owners.approve | Suspender |
| POST | `/admin/owners/:ownerId/reactivate` | owners.approve | Reactivar |
| POST | `/admin/owners/:ownerId/trigger-password-reset` | owners.approve | OTP reset password |
| DELETE | `/admin/owners/:ownerId` | owners.delete | Soft delete owner |
| POST | `/admin/businesses/:businessId/approve` | businesses.approve | Aprobar |
| POST | `/admin/businesses/:businessId/reject` | businesses.approve | Rechazar |
| POST | `/admin/businesses/:businessId/suspend` | businesses.suspend | Suspender |
| POST | `/admin/businesses/:businessId/reactivate` | businesses.suspend | Reactivar |
| DELETE | `/admin/businesses/:businessId` | businesses.delete | Eliminar |
| GET | `/admin/vehicles/:vehicleId` | owners.fleet | Detalle vehículo |
| POST | `/admin/vehicles/:vehicleId/approve` | owners.approve | Aprobar vehículo |
| POST | `/admin/vehicles/:vehicleId/reject` | owners.approve | Rechazar vehículo |
| POST | `/admin/vehicles/:vehicleId/suspend` | owners.approve | Suspender |
| POST | `/admin/vehicles/:vehicleId/reactivate` | owners.approve | Reactivar |
| DELETE | `/admin/vehicles/:vehicleId` | owners.delete | Eliminar vehículo |

---

## Admin — Operations Live

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/operations-live/snapshot` | Snapshot operaciones |
| GET | `/admin/operations-live/drivers` | Conductores en vivo |
| GET | `/admin/operations-live/trips` | Viajes activos |
| GET | `/admin/operations-live/alerts` | Alertas |
| GET | `/admin/operations-live/trips/:tripId` | Detalle viaje live |
| GET | `/admin/operations-live/trips/:tripId/available-drivers` | Conductores disponibles |
| POST | `/admin/operations-live/trips/:tripId/cancel` | Cancelar viaje |
| POST | `/admin/operations-live/trips/:tripId/reassign` | Reasignar |
| GET | `/admin/operations-live/trips/:tripId/dispatch-candidates` | Candidatos dispatch |
| POST | `/admin/operations-live/trips/:tripId/dispatch` | Dispatch manual |

---

## Admin — Trips 360

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/trips/:tripId/360` | Vista 360 del viaje |

---

## Admin — Alerts

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/alerts` | Listar alertas |
| POST | `/admin/alerts/:id/ack` | Acknowledge |
| POST | `/admin/alerts/:id/resolve` | Resolver |

---

## Admin — Security

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/security/summary` | Resumen seguridad |
| GET | `/admin/security/events` | Eventos |
| POST | `/admin/security/users/:id/suspend` | Suspender usuario |
| POST | `/admin/security/users/:id/unsuspend` | Reactivar |

---

## Admin — Finance

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/finance/summary` | Resumen finanzas |
| GET | `/admin/finance/payments` | Pagos |
| GET | `/admin/finance/subscriptions` | Suscripciones |
| POST | `/admin/finance/refunds` | Refunds |

---

## Admin — Support

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/support/tickets` | Tickets |
| POST | `/admin/support/tickets` | Crear ticket |
| PATCH | `/admin/support/tickets/:id` | Actualizar ticket |
| POST | `/admin/support/tickets/:id/messages` | Mensaje |
| GET | `/admin/support/users/:userId/history` | Historial usuario |

---

## Admin — Audit

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/audit` | Audit logs |

---

## Help

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/help/analytics/events` | No | Eventos help center |
| POST | `/help/support/tickets` | No | Ticket desde app |

---

## WebSocket

| Propiedad | Valor |
|-----------|-------|
| URL prod | `wss://movi-production-ef3b.up.railway.app/ws` |
| Protocolo | Socket.IO sobre HTTP server |
| Auth | JWT en handshake |
| Eventos | Trip updates, offers, location, chat |

---

## Códigos de error frecuentes

| code | Contexto |
|------|----------|
| `INVALID_PHONE` | Teléfono no normalizable |
| `SET_PASSWORD_REQUIRED` | Usuario sin passwordHash |
| `ADMIN_OTP_REQUIRED` | Admin intentó login con password |
| `PASSWORD_LOGIN_REQUIRED` | No-admin intentó login OTP |
| `LOGIN_LOCKED` | Lockout 15 min |
| `NETWORK_ERROR` | Solo frontend — fetch falló |
| `API_URL_MISSING` | Frontend sin EXPO_PUBLIC_API_URL |
