/** Textos de ayuda contextual por ruta (TUTOR MOVI). */
export const SCREEN_HELP: Record<string, string> = {
  '/': `TUTOR MOVI

Pantalla de inicio de sesión.

Ingresa tu teléfono y DUI.
Recibirás un código OTP.
Usa el código para entrar o registrarte.`,

  '/auth/otp': `TUTOR MOVI

Verificación OTP.

Revisa el código enviado a tu teléfono.
Ingrésalo y confirma.
Si eres nuevo, elegirás tu rol.`,

  '/auth/select-role': `TUTOR MOVI

Selección de rol.

Elige Pasajero, Dueño o Conductor.
Completa el registro según tu rol.`,

  '/auth/register-passenger': `TUTOR MOVI

Registro de pasajero.

Confirma tu nombre completo.
Tu DUI ya fue validado.
Al terminar podrás solicitar viajes.`,

  '/auth/register-owner': `TUTOR MOVI

Registro de dueño.

Registra tus datos y unidades.
Envía documentos para verificación.
Un administrador aprobará tu cuenta.`,

  '/auth/register-driver-code': `TUTOR MOVI

Registro de conductor.

Usa el código que te dio el dueño.
Completa tus datos personales.
Podrás conectarte cuando estés aprobado.`,

  '/passenger': `TUTOR MOVI

Inicio pasajero.

Aquí puedes solicitar un viaje.
Toca "¿A dónde vas?" para elegir destino.
Revisa notificaciones y actividad arriba.`,

  '/passenger/destination': `TUTOR MOVI

Selección de ruta.

Selecciona origen.
Selecciona destino.
Puedes buscar dirección o pegar coordenadas.
Elige una sugerencia de la lista.`,

  '/passenger/estimate': `TUTOR MOVI

Estimación de viaje.

Revisa distancia y precio estimado.
Elige mototaxi compartido o privado.
Confirma para buscar conductores.`,

  '/passenger/matching': `TUTOR MOVI

Buscando conductores.

Tu solicitud se envía a conductores cercanos.
Espera ofertas en unos segundos.
Luego podrás comparar precios y tiempos.`,

  '/passenger/offers': `TUTOR MOVI

Ofertas disponibles.

Compara precio y tiempo de llegada.
Elige la mejor oferta.
El conductor confirmará el viaje.`,

  '/passenger/driver': `TUTOR MOVI

Conductor asignado.

Ve datos del conductor y unidad.
Puedes chatear o llamar.
Sigue el viaje en el mapa.`,

  '/passenger/trip': `TUTOR MOVI

Viaje en curso.

Sigue la ruta en tiempo real.
Usa el chat si necesitas coordinar.
Al finalizar podrás calificar.`,

  '/passenger/rating': `TUTOR MOVI

Calificación.

Califica al conductor con estrellas.
Opcional: deja un comentario.
Tu opinión mejora el servicio.`,

  '/driver': `TUTOR MOVI

Inicio conductor.

Conéctate para recibir solicitudes.
Ajusta tu oferta con el stepper de precio.
Revisa ganancias e historial del día.`,

  '/driver/history': `TUTOR MOVI

Historial conductor.

Consulta viajes completados.
Revisa ganancias por fecha.`,

  '/driver/trip-active': `TUTOR MOVI

Viaje aceptado (conductor).

Tu oferta fue aceptada. Revisa pasajero, recogida, destino y precio.
1) Abre Waze hacia el pasajero.
2) Toca "Llegué" al estar en el punto.
3) Inicia el viaje cuando suba el pasajero.
4) Abre Waze hacia el destino y finaliza al terminar.`,

  '/driver/navigate-passenger': `TUTOR MOVI

Navegación al pasajero.

Abre Waze o Google Maps hacia el punto de recogida.
Desde aquí también puedes volver al viaje activo.`,

  '/driver/navigate-destination': `TUTOR MOVI

Navegación al destino.

Abre Waze o Google Maps hacia el destino del pasajero.
Desde aquí también puedes volver al viaje activo.`,

  '/owner/dashboard': `TUTOR MOVI

Dashboard dueño.

Aquí puedes monitorear unidades y conductores.
Revisa ingresos, kilómetros y sesiones.
Gestiona unidades y reportes desde el menú.`,

  '/owner/vehicles': `TUTOR MOVI

Mis unidades.

Lista de mototaxis registrados.
Toca una unidad para ver detalle.
Registra nuevas unidades si necesitas.`,

  '/owner/reports': `TUTOR MOVI

Reportes.

Resumen de operación de tu flota.
Exporta o revisa métricas clave.`,

  '/owner/register-vehicle': `TUTOR MOVI

Registrar unidad.

Ingresa placa y datos del mototaxi.
La unidad quedará pendiente de verificación.`,

  '/owner/invite-driver': `TUTOR MOVI

Invitar conductor.

Genera un código de invitación.
Compártelo con tu conductor.
Él lo usará al registrarse.`,

  '/owner/vehicle-detail': `TUTOR MOVI

Detalle de unidad.

Estado, placa y conductor asignado.
Gestiona la unidad desde aquí.`,

  '/admin/verifications': `TUTOR MOVI

Verificaciones admin.

Revisa dueños, vehículos y conductores pendientes.
Aprueba o rechaza según documentación.
Los usuarios recibirán el estado actualizado.`,

  '/notifications': `TUTOR MOVI

Notificaciones.

Alertas de viajes, ofertas y sistema.
Toca una notificación para ver detalle.`,

  '/activity': `TUTOR MOVI

Centro de actividad.

Historial reciente de eventos en MOVI.
Útil para seguimiento de operaciones.`,

  '/dev/qa': `TUTOR MOVI

QA automático (desarrollo).

Ejecuta pruebas de todos los flujos: registro, login, viajes, dueño, conductor y admin.
Reinicia datos demo y muestra resultados paso a paso.`,

  '/dev/learning': `TUTOR MOVI

Modo aprendizaje.

Recorre manualmente las pantallas principales de MOVI.
Ideal para conocer la app antes de usarla en producción.`,

  '/chat': `TUTOR MOVI

Chat del viaje.

Coordina con pasajero o conductor.
Los mensajes son solo para este viaje.`,
};

export const DEFAULT_HELP = `TUTOR MOVI

Pantalla de MOVI.

Usa los botones para navegar.
Si tienes dudas, contacta soporte desde tu perfil.`;

export function getHelpForRoute(pathname: string): string {
  if (SCREEN_HELP[pathname]) return SCREEN_HELP[pathname];

  const base = pathname.split('/').slice(0, 3).join('/');
  if (SCREEN_HELP[base]) return SCREEN_HELP[base];

  if (pathname.startsWith('/chat')) return SCREEN_HELP['/chat'] ?? DEFAULT_HELP;
  if (pathname.startsWith('/passenger')) return SCREEN_HELP['/passenger'] ?? DEFAULT_HELP;
  if (pathname.startsWith('/driver')) return SCREEN_HELP['/driver'] ?? DEFAULT_HELP;
  if (pathname.startsWith('/owner')) return SCREEN_HELP['/owner/dashboard'] ?? DEFAULT_HELP;

  return DEFAULT_HELP;
}
