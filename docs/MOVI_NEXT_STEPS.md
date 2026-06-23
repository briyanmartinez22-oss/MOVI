# MOVI — Próximos pasos

Prioridades ordenadas por impacto en beta privada. Actualizado según estado del código y bugs abiertos.

---

## P0 — Crítico (bloquea beta)

### 1. Resolver login owner (+50370328885)

**Problema:** Owner no puede login; error de red o auth fallido.

**Acciones:**

- [ ] Ejecutar `API_URL=https://movi-production-ef3b.up.railway.app npm run qa:owner-login`
- [ ] Verificar `passwordHash` en BD para `+50370328885`
- [ ] Activar `AUTH_LOGIN_DEBUG=1` temporal en Railway
- [ ] Si hash null → `trigger-password-reset` desde admin
- [ ] Rebuild APK EAS con env vars correctas
- [ ] Test desde dispositivo en El Salvador (red móvil)

**Owner:** Codex (backend/auth) + Cursor (UX error messages)

**Criterio de done:** Owner login exitoso con teléfono + contraseña desde APK producción.

---

### 2. Resolver eliminación de owner en SuperAdmin

**Problema:** Owner reaparece tras DELETE.

**Acciones:**

- [ ] Fix `listAdminOwners()` — filtrar `status != 'deleted'` y `deletedAt IS NULL`
- [ ] Verificar DELETE persiste en BD (audit log)
- [ ] Agregar test en `qa:admin-entities`
- [ ] Opcional: mostrar owners deleted en vista separada "Archivados"

**Owner:** Codex (backend)

**Criterio de done:** DELETE owner → refresh → owner no aparece en lista principal.

---

### 3. Resolver aprobación de vehículos

**Problema:** Vehículos aparecen rechazados sin revisión admin.

**Acciones:**

- [ ] Auditar vehículos `rejected` en producción (query SQL)
- [ ] Ejecutar `repair-vehicle-status` si son legacy auto-rejected
- [ ] Evaluar `namesMatch()` — considerar matching parcial para nombres SV
- [ ] Confirmar submit flow pone `under_review` en casos nuevos
- [ ] QA: owner sube vehículo → admin ve PENDING_REVIEW → approve manual

**Owner:** Codex (backend/moviService)

**Criterio de done:** Nuevo vehículo con docs completos llega a `under_review` y admin puede aprobar.

---

## P1 — Importante (beta quality)

### 4. TestFlight iOS

- [ ] Build iOS production profile en EAS
- [ ] `eas submit --platform ios`
- [ ] Configurar App Store Connect
- [ ] Invitar testers beta SV

### 5. Push notifications end-to-end

- [ ] Configurar `EXPO_ACCESS_TOKEN` en Railway
- [ ] Ejecutar `npm run qa:push` contra producción
- [ ] Test: viaje aceptado → push al pasajero
- [ ] Test: oferta recibida → push al pasajero
- [ ] Verificar permisos Android 13+ POST_NOTIFICATIONS

### 6. QA beta privada completa

- [ ] Ejecutar `npm run qa:beta-final` contra producción
- [ ] Ejecutar `npm run qa:beta-closed`
- [ ] Checklist manual: registro cada rol, viaje completo, admin approve
- [ ] Documentar resultados

### 7. Mejorar mensajes de error auth (frontend)

- [ ] Distinguir NETWORK_ERROR vs SET_PASSWORD_REQUIRED vs LOGIN_LOCKED
- [ ] No mostrar "Sin conexión" para HTTP 400
- [ ] Pantalla de diagnóstico para testers beta

**Owner:** Cursor (frontend UX)

---

## P2 — Mejoras (post-beta)

### 8. Seguridad multicapa SUPER_ADMIN

- [ ] Segundo factor adicional (no solo OTP + DUI)
- [ ] IP allowlist opcional para admin
- [ ] Session timeout más corto para admin
- [ ] Alertas en audit log para acciones SUPER_ADMIN

### 9. Analytics avanzados

- [ ] Dashboard métricas tiempo real
- [ ] Export CSV/PDF desde admin
- [ ] Heatmaps de demanda histórica
- [ ] KPIs por zona geográfica SV

### 10. Centro de Operaciones completo

- [ ] Alertas inteligentes automatizadas
- [ ] SLA monitoring
- [ ] Saturación de zonas
- [ ] Panel SOS activo

### 11. Deuda técnica

- [ ] Actualizar README_BACKEND (PostgreSQL-only)
- [ ] Alinear AGENTS.md con Expo 54 actual
- [ ] Migrar WebSocket a Socket.IO puro (FASE 8 planificada)
- [ ] Hard delete vs soft delete policy documentada

---

## Timeline sugerido

| Semana | Foco |
|--------|------|
| Semana 1 | P0 bugs (login, delete, vehicles) |
| Semana 2 | P1 QA beta + push notifications |
| Semana 3 | TestFlight + testers SV |
| Semana 4+ | P2 features + polish |

---

## Definición de "beta lista"

- [ ] P0 bugs resueltos y verificados en producción
- [ ] `qa:beta-final` PASS contra Railway
- [ ] APK Android distribuido a testers
- [ ] TestFlight activo (opcional pero recomendado)
- [ ] Al menos 1 viaje completo end-to-end en producción con usuario real SV
- [ ] Admin puede aprobar owner, vehicle, driver sin errores
