# MOVI — Funcionalidades completadas

Lista de funcionalidades **realmente implementadas** en el código actual. No incluye diseños o conversaciones sin código.

---

## Autenticación y seguridad

| Feature | Estado | Notas |
|---------|--------|-------|
| OTP vía Twilio Verify | ✅ | Producción Railway |
| Demo OTP (dev) | ✅ | Código `123456` |
| Login V2 — teléfono + contraseña | ✅ | `POST /auth/login` con password |
| Registro con contraseña (owner) | ✅ | `POST /owners/register` |
| Set initial password post-OTP | ✅ | `POST /auth/set-password` |
| Forgot password (OTP + reset) | ✅ | `POST /auth/forgot-password`, `/auth/reset-password` |
| Admin login OTP + DUI | ✅ | Sin contraseña para `role=admin` |
| JWT access token (1h) | ✅ | |
| Refresh token con rotación | ✅ | Tabla `RefreshToken` |
| Login lockout (15 min) | ✅ | Por teléfono |
| Normalización telefónica E.164 | ✅ | +503 / +1 |
| Phone lookup variantes legacy | ✅ | `findUserByPhone()` |
| Super admin bootstrap | ✅ | Startup automático |
| bcrypt password hash | ✅ | Mín 8 + letra + número |

---

## Roles y permisos

| Feature | Estado | Notas |
|---------|--------|-------|
| UserRole (5 roles app) | ✅ | passenger, driver, owner, business, admin |
| AdminStaffRole (5 sub-roles) | ✅ | SUPER, OPS, COMPLIANCE, SUPPORT, FINANCE |
| Matriz permisos granulares | ✅ | `admin-permissions.service.ts` |
| AdminStaffGuard backend | ✅ | `@RequirePermission`, `@AdminStaffRoles` |
| AdminRouteGuard frontend | ✅ | Mirror permisos en sidebar |
| Audit logs | ✅ | Acciones admin sensibles |

---

## Registro y verificación

| Feature | Estado | Notas |
|---------|--------|-------|
| Registro pasajero | ✅ | OTP → register |
| Registro owner + DUI | ✅ | Con documentos |
| Registro driver vía invite | ✅ | Código 6 chars |
| Registro business + ubicación | ✅ | |
| Upload documentos owner/vehicle | ✅ | Multipart + Cloudinary |
| Submit verificación owner | ✅ | |
| Submit verificación vehicle | ✅ | Con validación nombre tarjeta |
| Owner self-assign como driver | ✅ | |
| Vehicle invites (crear/cancelar/regenerar) | ✅ | |

---

## Flota y vehículos

| Feature | Estado | Notas |
|---------|--------|-------|
| Registro vehículo por owner | ✅ | Múltiples tipos |
| Check placa disponible | ✅ | |
| Vehicle types (9 tipos) | ✅ | mototaxi → camión |
| Soft delete vehículos | ✅ | |
| Admin approve/reject/suspend vehicle | ✅ | |
| Admin vehicle detail | ✅ | |

---

## Viajes y operaciones

| Feature | Estado | Notas |
|---------|--------|-------|
| Solicitar viaje (NOW) | ✅ | Múltiples service types |
| Viajes programados (SCHEDULED) | ✅ | microbus, pickup, camión |
| Sistema de ofertas (TripOffer) | ✅ | Driver oferta precio/ETA |
| Aceptar oferta | ✅ | |
| Trip lifecycle completo | ✅ | 8 estados |
| Cancelación de viaje | ✅ | |
| Historial de viajes | ✅ | |
| Chat por viaje | ✅ | |
| Ratings post-viaje | ✅ | |
| Delivery extension | ✅ | Tabla Delivery |
| Provider eligibility / matching | ✅ | Radio por tipo vehículo |
| Driver sessions (online/offline) | ✅ | Requerido para NOW |
| WebSocket realtime | ✅ | `/ws` Socket.IO |
| Location pings | ✅ | |

---

## Dashboard Admin

| Feature | Estado | Notas |
|---------|--------|-------|
| Admin shell + sidebar | ✅ | Expo Web responsive |
| Home KPIs ejecutivos | ✅ | |
| Operations Live | ✅ | Mapa, tabla viajes, alertas |
| Dispatch manual | ✅ | Asignar conductor a viaje |
| Reassign driver | ✅ | |
| Trip 360 view | ✅ | |
| CRUD Passengers admin | ✅ | Ver, editar, suspender, eliminar |
| CRUD Drivers admin | ✅ | Aprobar, rechazar, suspender |
| CRUD Owners admin | ✅ | Aprobar, suspender, reset password |
| CRUD Businesses admin | ✅ | |
| CRUD Vehicles admin | ✅ | |
| Finance module | ✅ | Pagos, suscripciones, refunds |
| Support tickets | ✅ | |
| Security module | ✅ | Eventos, suspend users |
| Audit log viewer | ✅ | |
| Analytics / métricas | ✅ | KPIs, providers, trips, ratings |
| Integrations status | ✅ | Maps, OTP, storage, push |
| Beta platform reset | ✅ | SUPER_ADMIN only |
| User impersonation | ✅ | SUPER_ADMIN only |
| Admin staff management | ✅ | |
| Trigger owner password reset | ✅ | Envía OTP |

---

## Maps y ubicación

| Feature | Estado | Notas |
|---------|--------|-------|
| Google Maps integration | ✅ | Geocoding, routes, distance |
| Demand zones | ✅ | |
| Mapa en app (MoviMapView) | ✅ | Native + Web variants |
| Waze deep link utility | ✅ | |
| Hotspot filters | ✅ | |

---

## Notificaciones

| Feature | Estado | Notas |
|---------|--------|-------|
| Push token registration | ✅ | Expo push |
| In-app notifications | ✅ | Tabla Notification |
| PushNotificationManager component | ✅ | |
| Expo notifications plugin | ✅ | app.json |

---

## Suscripciones y pagos

| Feature | Estado | Notas |
|---------|--------|-------|
| Driver subscription ($7/mes) | ✅ | Trial hasta próximo mes |
| Subscription status checks | ✅ | Bloquea operación si vencida |
| Payment model + provider abstraction | ✅ | |
| Admin finance refunds | ✅ | |

---

## Infraestructura y DevOps

| Feature | Estado | Notas |
|---------|--------|-------|
| Railway deploy (Docker) | ✅ | Auto migrate on start |
| PostgreSQL + Prisma | ✅ | |
| EAS Android APK build | ✅ | Profile preview |
| EAS iOS build config | ✅ | Profile preview |
| Health endpoint | ✅ | |
| CORS configurado | ✅ | |
| Cloudinary storage | ✅ | Prod documents |
| Local/S3 storage fallback | ✅ | |
| Docker compose local PG | ✅ | |
| QA scripts suite | ✅ | 20+ scripts en backend/scripts |
| CI QA gate | ✅ | `test:ci` |

---

## UX y app

| Feature | Estado | Notas |
|---------|--------|-------|
| Expo Router navigation | ✅ | File-based routes |
| Auth flows UI (login, OTP, forgot) | ✅ | |
| Onboarding por rol | ✅ | |
| Help center / contextual help | ✅ | |
| Branded loading, theme MOVI | ✅ | |
| Mock API mode | ✅ | Demo offline |
| Demo simulation engine | ✅ | |
| Legal consent checkbox | ✅ | |
| Keyboard aware screens | ✅ | |
| Android permissions config | ✅ | Location, camera, notifications |

---

## Documentación

| Feature | Estado | Notas |
|---------|--------|-------|
| backend/README_BACKEND.md | ✅ | |
| docs/ handoff técnico | ✅ | Este directorio |
| AGENTS.md (Expo v56 ref) | ✅ | |
