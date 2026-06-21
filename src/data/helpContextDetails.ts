import type { HelpSectionId } from './helpCenterContent';

export type HelpContextEntry = {
  title: string;
  summary: string;
  sectionId: HelpSectionId;
};

const DEFAULT: HelpContextEntry = {
  title: 'Aprende MOVI',
  summary: 'Explora guías por rol, seguridad y soporte desde el centro de ayuda.',
  sectionId: 'what-is-movi',
};

const CONTEXT_MAP: Record<string, HelpContextEntry> = {
  '/welcome': {
    title: 'Bienvenido a MOVI',
    summary: 'MOVI conecta pasajeros, conductores y comercios. Inicia sesión o crea tu cuenta para empezar.',
    sectionId: 'what-is-movi',
  },
  '/auth/login': {
    title: 'Iniciar sesión',
    summary: 'Usa tu teléfono salvadoreño (+503). Recibirás un código OTP por SMS para entrar.',
    sectionId: 'otp-guide',
  },
  '/auth/otp': {
    title: 'Código OTP',
    summary: 'Ingresa el código de 6 dígitos enviado a tu teléfono. No lo compartas con nadie.',
    sectionId: 'otp-guide',
  },
  '/auth/register-passenger': {
    title: 'Registro pasajero',
    summary: 'Solo necesitas nombre y teléfono verificado. No se requiere DUI para pasajeros.',
    sectionId: 'registration-guide',
  },
  '/auth/register-account': {
    title: 'Crear cuenta',
    summary: 'Elige el tipo de cuenta que usarás en MOVI: pasajero, conductor, dueño o comercio.',
    sectionId: 'registration-guide',
  },
  '/auth/register-driver-code': {
    title: 'Registro conductor',
    summary: 'Usa el código de invitación del dueño y completa DUI y documentos para verificación.',
    sectionId: 'driver-guide',
  },
  '/auth/register-owner': {
    title: 'Registro dueño/proveedor',
    summary: 'Registra DUI, vehículos y documentos. Un administrador revisará tu solicitud.',
    sectionId: 'owner-guide',
  },
  '/auth/register-business': {
    title: 'Registro comercio',
    summary: 'Crea tu perfil comercial para solicitar entregas y seguimiento de pedidos.',
    sectionId: 'business-guide',
  },
  '/passenger': {
    title: 'Pasajero',
    summary: 'Define origen y destino, solicita un viaje y compara ofertas de conductores.',
    sectionId: 'trips-guide',
  },
  '/passenger/matching': {
    title: 'Buscando conductor',
    summary: 'MOVI está notificando conductores cercanos. Puedes cancelar si cambias de plan.',
    sectionId: 'trips-guide',
  },
  '/passenger/offers': {
    title: 'Ofertas disponibles',
    summary: 'Compara precio, ETA y calificación. Acepta la oferta que prefieras.',
    sectionId: 'trips-guide',
  },
  '/passenger/trip': {
    title: 'Viaje activo',
    summary: 'Sigue al conductor en el mapa, contacta por chat o teléfono y revisa el ETA.',
    sectionId: 'trips-guide',
  },
  '/passenger/rating': {
    title: 'Calificar viaje',
    summary: 'Tu opinión ayuda a mejorar el servicio. Califica al conductor del 1 al 5.',
    sectionId: 'trips-guide',
  },
  '/driver': {
    title: 'Conductor',
    summary: 'Activa disponibilidad, recibe solicitudes y envía ofertas competitivas.',
    sectionId: 'driver-guide',
  },
  '/driver/trip-active': {
    title: 'Viaje en curso',
    summary: 'Navega al pasajero, marca llegada, valida OTP e completa el viaje.',
    sectionId: 'driver-guide',
  },
  '/driver/rating': {
    title: 'Calificar pasajero',
    summary: 'Evalúa la experiencia con el pasajero. Solo una calificación por viaje.',
    sectionId: 'driver-guide',
  },
  '/business/dashboard': {
    title: 'Panel comercio',
    summary: 'Solicita entregas, revisa historial y contacta soporte operativo.',
    sectionId: 'business-guide',
  },
  '/admin': {
    title: 'Panel administrativo',
    summary: 'KPIs, operaciones en vivo, soporte, finanzas y seguridad según tu rol.',
    sectionId: 'admin-guide',
  },
  '/admin/operations-live': {
    title: 'Centro de operaciones',
    summary: 'Monitorea viajes live, alertas, dispatch manual y reasignaciones.',
    sectionId: 'admin-guide',
  },
};

export function resolveHelpContext(pathname: string): HelpContextEntry {
  if (CONTEXT_MAP[pathname]) return CONTEXT_MAP[pathname];

  const prefix = Object.keys(CONTEXT_MAP).find((route) => pathname.startsWith(route));
  if (prefix) return CONTEXT_MAP[prefix];

  if (pathname.startsWith('/admin')) {
    return {
      title: 'Admin MOVI',
      summary: 'Usa el menú según tu rol. El backend valida permisos en cada acción.',
      sectionId: 'admin-guide',
    };
  }

  if (pathname.startsWith('/passenger')) {
    return CONTEXT_MAP['/passenger'];
  }
  if (pathname.startsWith('/driver')) {
    return CONTEXT_MAP['/driver'];
  }
  if (pathname.startsWith('/business')) {
    return CONTEXT_MAP['/business/dashboard'];
  }
  if (pathname.startsWith('/owner')) {
    return CONTEXT_MAP['/auth/register-owner'];
  }

  return DEFAULT;
}
