# MOVI — Guía de pruebas remotas (El Salvador)

Desarrollo desde **Dallas, Texas** → testers en **El Salvador** vía **Expo Go + backend público en internet**.

---

## 1. Desplegar backend remoto

### Opción A — Railway (recomendada)

1. Crear proyecto en [Railway](https://railway.app).
2. Añadir servicio **PostgreSQL**.
3. Añadir servicio desde repo Git → carpeta `backend/`.
4. Variables de entorno en Railway:

```env
NODE_ENV=production
DATABASE_URL=<copiar de PostgreSQL Railway>
JWT_SECRET=<string largo aleatorio>
CORS_ORIGIN=*
DEMO_OTP_CODE=123456
PUBLIC_URL=https://TU_APP.up.railway.app
STORAGE_MODE=local
```

5. Railway detecta `Dockerfile` y `railway.json`.
6. Tras el primer deploy, ejecutar **una vez** en Railway shell o local con `DATABASE_URL` remota:

```bash
cd backend
npm run db:migrate:deploy
npm run db:seed
```

### Opción B — Render

1. Conectar repo → usar `backend/render.yaml`.
2. Render crea PostgreSQL + web service automáticamente.
3. Ejecutar seed tras primer deploy (Render shell):

```bash
npm run db:seed
```

### Opción C — Supabase PostgreSQL + Railway/Render API

1. Crear proyecto Supabase → copiar `DATABASE_URL` (connection pooling o direct).
2. Desplegar solo el backend en Railway/Render con esa `DATABASE_URL`.

---

## 2. Confirmar `/health`

```bash
curl https://TU_URL_PUBLICA/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "MOVI backend",
  "database": "connected",
  "environment": "production"
}
```

Si `database: "disconnected"` → revisar `DATABASE_URL` y migraciones.

---

## 3. QA automático contra backend remoto

Desde tu máquina (Dallas):

```bash
cd backend
API_URL=https://TU_URL_PUBLICA \
WS_URL=wss://TU_URL_PUBLICA/ws \
npm run qa:remote
```

Debe pasar todas las pruebas (health, login, viaje, oferta, chat).

---

## 4. Configurar Expo para testers

```bash
cd MOVI
cp .env.remote.example .env
```

Editar `.env` con la URL real:

```env
EXPO_PUBLIC_API_URL=https://TU_URL_PUBLICA
EXPO_PUBLIC_WS_URL=wss://TU_URL_PUBLICA/ws
EXPO_PUBLIC_USE_MOCK_API=false
```

---

## 5. Iniciar Expo tunnel

```bash
npm run start:tunnel
# o: npx expo start --tunnel
```

- Aparece un **QR** en la terminal.
- El tunnel permite que teléfonos en El Salvador accedan sin estar en tu red local.
- **No uses** IP LAN (`100.x.x.x`) ni `localhost` para testers remotos.

---

## 6. Instalar Expo Go

### iPhone
1. App Store → buscar **Expo Go** → instalar.
2. Abrir **Cámara** → escanear QR de la terminal.
3. Se abre MOVI en Expo Go.

### Android
1. Play Store → **Expo Go** → instalar.
2. Abrir Expo Go → **Scan QR code**.
3. Escanear QR de la terminal.

---

## 7. Cuentas demo (El Salvador)

| Rol | Teléfono | DUI | OTP |
|-----|----------|-----|-----|
| Pasajero | `78214898` | `71542253-8` | `123456` |
| Conductor | `78981234` | `12345678-9` | `123456` |
| Dueño | `71234567` | `04567890-1` | `123456` |
| Admin | `70801111` | `00000000-0` | `123456` |

Seed crea: 1 vehículo aprobado, 1 conductor asignado, suscripción en gracia.

---

## 8. Flujo a probar

```
Pasajero crea viaje → Conductor conectado recibe solicitud →
Conductor oferta → Pasajero acepta → Chat bidireccional →
Cerrar/reabrir chat (historial visible)
```

---

## 9. Checklist — Teléfono 1 (Conductor)

- [ ] Abrir Expo Go → escanear QR
- [ ] Login: `78981234` → OTP `123456` → DUI `12345678-9`
- [ ] Entrar como conductor
- [ ] Presionar **Conectarse**
- [ ] Confirmar: **"Esperando solicitudes"**

## Checklist — Teléfono 2 (Pasajero)

- [ ] Abrir Expo Go → escanear QR
- [ ] Login: `78214898` → OTP `123456` → DUI `71542253-8`
- [ ] Crear viaje: origen → destino → pasajeros → enviar

## Conductor (durante prueba)

- [ ] Recibe solicitud (modal o estado **"Nueva solicitud disponible"**)
- [ ] Ve origen, destino, pasajeros, descripción
- [ ] Envía oferta

## Pasajero

- [ ] Recibe oferta real (nombre, placa, ETA, precio)
- [ ] Acepta oferta
- [ ] Abre chat

## Ambos

- [ ] Envían mensajes
- [ ] Cierran chat
- [ ] Reabren chat → historial visible

## Dueño (opcional, tercer teléfono)

- [ ] Login: `71234567` / OTP `123456` / DUI `04567890-1`
- [ ] Ver vehículo aprobado
- [ ] Ver conductor asignado

## Admin (opcional)

- [ ] Login: `70801111` / OTP `123456` / DUI `00000000-0`
- [ ] Ver KPIs básicos en dashboard

---

## 10. Errores a documentar

| Síntoma | Posible causa | Qué reportar |
|---------|---------------|--------------|
| "Sin conexión" al login | URL incorrecta en `.env` | Captura + URL usada |
| OTP no llega | Normal en demo — usar `123456` | — |
| Conductor no recibe solicitud | No presionó Conectarse | Confirmar sesión activa |
| Ofertas no aparecen | WS caído | ¿Polling REST funcionó? |
| Chat vacío al reabrir | Backend sin historial | Trip ID + hora |
| Expo no carga | Tunnel caído | Reiniciar `npm run start:tunnel` |

Reportar: dispositivo (iOS/Android), hora (SV), rol, paso exacto, captura de pantalla.

---

## Comandos rápidos

```bash
# Backend local (solo dev en Dallas)
cd backend && npm run dev

# Backend producción local (simular)
cd backend && npm run build && npm run start:prod

# Seed
cd backend && npm run db:seed

# Expo tunnel para El Salvador
cd MOVI && npm run start:tunnel

# QA remoto
cd backend && API_URL=https://TU_URL npm run qa:remote
```
