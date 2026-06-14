# MOVI — Reporte técnico: listo para pruebas remotas

**Fecha:** 2026-06-14  
**Alcance:** Backend Railway/Render + PostgreSQL + Expo tunnel → testers El Salvador  
**Entorno de validación:** Linux local (sin Docker daemon)

---

## Estado por componente

| Componente | Listo | Evidencia |
|------------|-------|-----------|
| **BACKEND** | **Sí** | `npm run build` OK; `/health` responde `status: ok`; Dockerfile corregido para PostgreSQL |
| **POSTGRES** | **Parcial** | Schema y migraciones validados localmente; **requiere instancia cloud real** (Railway/Render/Supabase) |
| **PRISMA** | **Sí** | `prisma validate` OK; 3 migraciones; `migrate status` → up to date |
| **SEED** | **Sí** | `npm run db:seed` OK — cuentas demo El Salvador creadas |
| **EXPO** | **Sí** | `npm run typecheck` OK; `.env.remote.example` con vars correctas |
| **MOCK API** | **Desactivado** | `.env.remote.example` → `EXPO_PUBLIC_USE_MOCK_API=false` |
| **WEBSOCKET** | **Sí** | Hub en `/ws`; URL derivable como `wss://HOST/ws` |

---

## Validaciones ejecutadas

### Fase 1 — Infraestructura

| Artefacto | Resultado | Detalle |
|-----------|-----------|---------|
| `backend/Dockerfile` | Corregido | Genera cliente Prisma PostgreSQL en build; `prisma generate` en runtime |
| `backend/railway.json` | Válido | JSON válido; healthcheck `/health` |
| `backend/render.yaml` | Válido | YAML válido; añadido `PUBLIC_URL` |
| Prisma validate | OK | Schema válido |
| Migraciones | OK | 3 migraciones aplicadas tras reset DB local |
| Seed | OK | 5 roles demo creados |
| Build backend | OK | NestJS compila sin errores |

### Errores encontrados y corregidos

1. **Migración pendiente en DB local corrupta** — `20260613100000_production_schema` fallaba con `duplicate column name: brand` porque la DB local tenía columnas fuera de migraciones. **Resuelto:** reset `dev.db` + `migrate deploy` limpio.
2. **Dockerfile generaba cliente SQLite en build** — en producción con `DATABASE_URL=postgresql://...` el runtime fallaría. **Corregido:** `DATABASE_PROVIDER=postgresql` en build + `prisma generate` en CMD.
3. **`.env.example` raíz** — faltaban referencias a `PORT`, `DATABASE_URL`, `JWT_SECRET`. **Corregido.**
4. **`render.yaml`** — faltaba `PUBLIC_URL`. **Corregido.**

### No verificado en este entorno

- **`docker build`** — Docker daemon no instalado (`docker: command not found`). Dockerfile revisado manualmente; requiere verificación en máquina con Docker o en Railway al primer deploy.
- **PostgreSQL remoto real** — no hay instancia cloud conectada en esta sesión.
- **Expo tunnel end-to-end** — requiere URL pública del backend ya desplegado.

---

## Variables de entorno verificadas

### `.env.example` (raíz — Expo)

| Variable | Presente | Valor |
|----------|----------|-------|
| `EXPO_PUBLIC_API_URL` | Sí | placeholder HTTPS |
| `EXPO_PUBLIC_WS_URL` | Sí | placeholder WSS `/ws` |
| `EXPO_PUBLIC_USE_MOCK_API` | Sí | `false` |
| `PORT` | Sí (comentado) | referencia backend |
| `DATABASE_URL` | Sí (comentado) | referencia backend |
| `JWT_SECRET` | Sí (comentado) | referencia backend |

### `.env.remote.example` (raíz — pruebas remotas)

| Variable | Presente | Valor |
|----------|----------|-------|
| `EXPO_PUBLIC_API_URL` | Sí | placeholder |
| `EXPO_PUBLIC_WS_URL` | Sí | placeholder |
| `EXPO_PUBLIC_USE_MOCK_API` | Sí | `false` |
| `PORT` | Sí (comentado) | referencia backend |
| `DATABASE_URL` | Sí (comentado) | referencia backend |
| `JWT_SECRET` | Sí (comentado) | referencia backend |

### `backend/.env.example` (backend)

| Variable | Presente |
|----------|----------|
| `PORT` | Sí — `3001` |
| `DATABASE_URL` | Sí — SQLite dev + ejemplo PostgreSQL |
| `JWT_SECRET` | Sí |

---

## Fase 5 — Resultados de comandos locales

```text
# Raíz
npm install          → OK (warnings EBADENGINE node 20.19.2 vs 20.19.4 — no bloqueante)
npm run build        → ERROR: Missing script (Expo Go no usa build de producción)
npm run typecheck    → OK

# Backend
npm run build                    → OK
npm run prisma:validate          → OK — schema valid
npm run prisma:migrate:status    → OK — 3 migrations, up to date
npm run db:seed                  → OK
curl http://127.0.0.1:3099/health → {"status":"ok","database":"connected",...}
```

---

## RIESGOS RESTANTES

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Docker build no ejecutado localmente | Media | Primer deploy en Railway validará imagen |
| PostgreSQL remoto no provisionado | Alta | Seguir DEPLOYMENT_GUIDE.md PASO 2 |
| Seed en contenedor prod sin `tsx` | Baja | Usar `railway run npm run db:seed` desde local |
| Node 20.19.2 vs 20.19.4 (Expo) | Baja | Actualizar Node a ≥ 20.19.4 en máquina dev |
| Uploads en `STORAGE_MODE=local` | Media | Archivos en disco efímero del contenedor; OK para QA, no producción larga |
| OTP demo fijo `123456` | Baja | Aceptable para pruebas; cambiar antes de producción real |
| Sin Twilio | Baja | OTP se loguea en consola del backend |

---

## BLOQUEADORES

1. **Despliegue cloud pendiente** — No existe URL pública del backend en esta sesión. Sin ella, testers en El Salvador no pueden conectar la app real.
2. **Instancia PostgreSQL remota** — Debe crearse en Railway/Render/Supabase y vincularse via `DATABASE_URL`.
3. **Verificación Docker en CI/host real** — Entorno local sin Docker; confianza basada en revisión de Dockerfile + build NestJS OK.

---

## PRÓXIMO PASO

1. Ejecutar checklist **PASO 1–7** de `DEPLOYMENT_GUIDE.md` (Railway + PostgreSQL + migraciones + seed + `/health`).
2. Copiar URL pública a `.env` (`cp .env.remote.example .env`).
3. `npx expo start --tunnel` y enviar QR a testers en El Salvador.
4. Login con pasajero demo `78214898` / OTP `123456`.

---

## Archivos modificados en esta sesión

- `backend/Dockerfile` — cliente Prisma PostgreSQL + generate en runtime
- `backend/render.yaml` — variable `PUBLIC_URL`
- `.env.example` — referencias backend + vars Expo completas
- `.env.remote.example` — referencias backend + vars Expo completas
- `DEPLOYMENT_GUIDE.md` — creado
- `REMOTE_TEST_READY_REPORT.md` — creado
