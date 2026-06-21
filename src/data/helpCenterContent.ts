export type HelpSectionId =
  | 'what-is-movi'
  | 'user-types'
  | 'registration-guide'
  | 'otp-guide'
  | 'driver-guide'
  | 'owner-guide'
  | 'trips-guide'
  | 'delivery-guide'
  | 'business-guide'
  | 'account-status'
  | 'security'
  | 'payments-guide'
  | 'admin-guide'
  | 'faq'
  | 'support';

export type HelpIconName =
  | 'information-circle'
  | 'people'
  | 'person-add'
  | 'car'
  | 'cube'
  | 'help-circle'
  | 'headset'
  | 'shield-checkmark'
  | 'storefront'
  | 'wallet'
  | 'key';

export type HelpStep = {
  order: number;
  title: string;
  description: string;
  /** Clave para asset futuro, ej. help/registration-step-1.png */
  screenshotKey?: string;
  screenshotAlt?: string;
};

export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'steps'; steps: HelpStep[] };

export type HelpSection = {
  id: HelpSectionId;
  title: string;
  subtitle: string;
  icon: HelpIconName;
  keywords: string[];
  blocks: HelpBlock[];
};

export type HelpSupportChannel = {
  id: 'whatsapp' | 'email' | 'form';
  label: string;
  value: string;
  description: string;
};

export const HELP_SUPPORT_CHANNELS: HelpSupportChannel[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    value: '+50370000000',
    description: 'Respuesta en horario laboral (El Salvador).',
  },
  {
    id: 'email',
    label: 'Correo',
    value: 'soporte@movi.sv',
    description: 'Soporte técnico y reclamos.',
  },
  {
    id: 'form',
    label: 'Formulario interno',
    value: 'in-app',
    description: 'Envía tu consulta desde la app (conectable a ticketing).',
  },
];

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'what-is-movi',
    title: '¿Qué es MOVI?',
    subtitle: 'Conoce la plataforma',
    icon: 'information-circle',
    keywords: ['movi', 'plataforma', 'qué es', 'servicios', 'logística', 'el salvador'],
    blocks: [
      {
        type: 'paragraph',
        text: 'MOVI es la plataforma de movilidad, entregas y logística de El Salvador. Conecta pasajeros, conductores, comercios y proveedores en un ecosistema digital.',
      },
      { type: 'heading', text: 'Servicios' },
      {
        type: 'bullets',
        items: [
          'Viajes urbanos e interurbanos.',
          'Entregas de comida y productos.',
          'Mensajería punto a punto.',
          'Paquetería y envíos ligeros.',
          'Entregas comerciales para negocios.',
        ],
      },
      { type: 'heading', text: 'Cómo funciona' },
      {
        type: 'bullets',
        items: [
          'Solicitas un servicio desde la app.',
          'Conductores elegibles envían ofertas.',
          'Eliges la mejor opción y sigues el servicio en tiempo real.',
          'Al finalizar, calificas la experiencia.',
        ],
      },
    ],
  },
  {
    id: 'user-types',
    title: 'Tipos de usuario',
    subtitle: 'Roles en MOVI',
    icon: 'people',
    keywords: ['pasajero', 'conductor', 'comercio', 'proveedor', 'dueño', 'roles'],
    blocks: [
      { type: 'heading', text: 'Pasajero' },
      {
        type: 'bullets',
        items: ['Viajes, entregas, mensajería, paquetería.', 'Pagos y calificaciones.'],
      },
      { type: 'heading', text: 'Conductor' },
      {
        type: 'bullets',
        items: ['Recibe solicitudes, envía ofertas, ejecuta servicios.', 'Documentación al día.'],
      },
      { type: 'heading', text: 'Comercio' },
      {
        type: 'bullets',
        items: ['Entregas frecuentes, pedidos y repartidores MOVI.'],
      },
      { type: 'heading', text: 'Proveedor de servicios' },
      {
        type: 'bullets',
        items: ['Registra unidades, invita conductores, administra flota.'],
      },
    ],
  },
  {
    id: 'registration-guide',
    title: 'Guía de registro',
    subtitle: 'Crea tu cuenta paso a paso',
    icon: 'person-add',
    keywords: ['registro', 'crear cuenta', 'perfil', 'activar', 'documentos'],
    blocks: [
      {
        type: 'steps',
        steps: [
          {
            order: 1,
            title: 'Crear cuenta',
            description: 'Elige pasajero, conductor/unidad o comercio. Ingresa nombre, apellido y teléfono.',
            screenshotKey: 'help/registration-step-1',
            screenshotAlt: 'Pantalla crear cuenta',
          },
          {
            order: 2,
            title: 'Verificar teléfono',
            description: 'Recibe el código OTP por SMS e ingrésalo en la app.',
            screenshotKey: 'help/registration-step-2',
            screenshotAlt: 'Verificación OTP',
          },
          {
            order: 3,
            title: 'Seleccionar tipo de usuario',
            description: 'Confirma si usarás MOVI como pasajero, conductor, proveedor o comercio.',
            screenshotKey: 'help/registration-step-3',
            screenshotAlt: 'Tipo de usuario',
          },
          {
            order: 4,
            title: 'Completar perfil',
            description: 'Pasajeros quedan listos. Conductores y proveedores suben DUI y documentos.',
            screenshotKey: 'help/registration-step-4',
            screenshotAlt: 'Completar perfil',
          },
        ],
      },
      {
        type: 'paragraph',
        text: 'Los conductores requieren aprobación MOVI antes de recibir solicitudes.',
      },
    ],
  },
  {
    id: 'otp-guide',
    title: 'Código OTP',
    subtitle: 'Verificación de teléfono',
    icon: 'key',
    keywords: ['otp', 'código', 'sms', 'verificar', 'teléfono', 'no llega'],
    blocks: [
      { type: 'heading', text: '¿Qué es el OTP?' },
      {
        type: 'paragraph',
        text: 'Es un código de un solo uso enviado por SMS para confirmar que el teléfono te pertenece.',
      },
      { type: 'heading', text: 'Pasos' },
      {
        type: 'steps',
        steps: [
          {
            order: 1,
            title: 'Solicitar código',
            description: 'Ingresa tu número +503 y pulsa continuar.',
            screenshotKey: 'help/otp-step-1',
          },
          {
            order: 2,
            title: 'Recibir SMS',
            description: 'Llegará un mensaje con 6 dígitos. Puede tardar hasta 2 minutos.',
            screenshotKey: 'help/otp-step-2',
          },
          {
            order: 3,
            title: 'Ingresar código',
            description: 'Escribe el OTP en la pantalla de verificación.',
            screenshotKey: 'help/otp-step-3',
          },
        ],
      },
      { type: 'heading', text: 'Si no llega el código' },
      {
        type: 'bullets',
        items: [
          'Verifica señal y número correcto.',
          'Espera 2 minutos y solicita reenvío.',
          'No compartas el código con nadie.',
        ],
      },
    ],
  },
  {
    id: 'driver-guide',
    title: 'Guía para conductores',
    subtitle: 'Operación diaria',
    icon: 'car',
    keywords: ['conductor', 'ofertas', 'documentos', 'licencia', 'dui', 'cobrar'],
    blocks: [
      {
        type: 'steps',
        steps: [
          {
            order: 1,
            title: 'Registrarse e invitación',
            description: 'Usa código del dueño o registra tu unidad como proveedor.',
            screenshotKey: 'help/driver-step-1',
          },
          {
            order: 2,
            title: 'Subir documentos',
            description: 'DUI, licencia, tarjeta de circulación y foto del vehículo.',
            screenshotKey: 'help/driver-step-2',
          },
          {
            order: 3,
            title: 'Activar cuenta',
            description: 'Espera aprobación MOVI y conéctate en la app.',
            screenshotKey: 'help/driver-step-3',
          },
          {
            order: 4,
            title: 'Recibir y ofertar',
            description: 'Recibe solicitudes, envía precio y ETA competitivos.',
            screenshotKey: 'help/driver-step-4',
          },
          {
            order: 5,
            title: 'Finalizar y cobrar',
            description: 'Actualiza estados del viaje y cobra según acuerdo con el pasajero.',
            screenshotKey: 'help/driver-step-5',
          },
        ],
      },
    ],
  },
  {
    id: 'trips-guide',
    title: 'Guía de viajes',
    subtitle: 'Solicitar y seguir un viaje',
    icon: 'car',
    keywords: ['viaje', 'viajes', 'solicitar', 'ofertas', 'cancelar viaje', 'pasajero'],
    blocks: [
      {
        type: 'steps',
        steps: [
          {
            order: 1,
            title: 'Definir destino',
            description: 'Elige origen y destino en el mapa o buscador.',
            screenshotKey: 'help/trip-step-1',
          },
          {
            order: 2,
            title: 'Solicitar servicio',
            description: 'Confirma tipo de viaje y envía la solicitud.',
            screenshotKey: 'help/trip-step-2',
          },
          {
            order: 3,
            title: 'Elegir oferta',
            description: 'Compara precio y tiempo; acepta la mejor opción.',
            screenshotKey: 'help/trip-step-3',
          },
          {
            order: 4,
            title: 'Seguir en vivo',
            description: 'Ve ubicación del conductor y estado del viaje.',
            screenshotKey: 'help/trip-step-4',
          },
        ],
      },
      { type: 'heading', text: 'Cancelar viaje' },
      {
        type: 'paragraph',
        text: 'Desde la pantalla activa del viaje puedes cancelar según políticas vigentes. Consulta FAQ para reembolsos.',
      },
      { type: 'heading', text: 'Calificar y soporte' },
      {
        type: 'bullets',
        items: [
          'Al finalizar, califica al conductor del 1 al 5.',
          'Solo una calificación por viaje.',
          'Usa Aprende MOVI o soporte para reportar incidentes.',
        ],
      },
    ],
  },
  {
    id: 'delivery-guide',
    title: 'Entregas y paquetería',
    subtitle: 'Mensajería y envíos',
    icon: 'cube',
    keywords: ['entrega', 'paquetería', 'mensajería', 'paquete', 'seguimiento'],
    blocks: [
      {
        type: 'steps',
        steps: [
          { order: 1, title: 'Crear solicitud', description: 'Origen, destino y tipo de envío.', screenshotKey: 'help/delivery-step-1' },
          { order: 2, title: 'Seguimiento', description: 'Monitorea cuando un conductor acepta.', screenshotKey: 'help/delivery-step-2' },
          { order: 3, title: 'Entrega', description: 'Confirma recepción del paquete.', screenshotKey: 'help/delivery-step-3' },
          { order: 4, title: 'Calificación', description: 'Califica al conductor.', screenshotKey: 'help/delivery-step-4' },
        ],
      },
    ],
  },
  {
    id: 'business-guide',
    title: 'Centro para comercios',
    subtitle: 'Restaurantes, tiendas y más',
    icon: 'storefront',
    keywords: ['comercio', 'restaurante', 'tienda', 'farmacia', 'negocio', 'pedidos', 'entregas'],
    blocks: [
      { type: 'heading', text: 'Tipos de comercio' },
      {
        type: 'bullets',
        items: ['Restaurantes y cafeterías.', 'Tiendas y retail.', 'Farmacias.', 'Negocios con entrega propia.'],
      },
      { type: 'heading', text: 'Cómo solicitar entregas' },
      {
        type: 'bullets',
        items: [
          'Registra tu comercio con datos fiscales y ubicación.',
          'Crea solicitudes de entrega con destino del cliente.',
          'Asigna detalles del pedido (peso, frágil, etc.).',
        ],
      },
      { type: 'heading', text: 'Administrar pedidos' },
      {
        type: 'paragraph',
        text: 'Desde el panel de comercio revisa solicitudes activas, historial y estado de cada entrega.',
      },
      { type: 'heading', text: 'Trabajar con conductores' },
      {
        type: 'bullets',
        items: [
          'Los conductores MOVI aceptan entregas como ofertas.',
          'Coordina horarios pico con solicitudes programadas (cuando esté disponible).',
          'Califica conductores para mantener calidad de servicio.',
        ],
      },
    ],
  },
  {
    id: 'account-status',
    title: 'Estado de cuenta',
    subtitle: 'Pagos, historial y facturación',
    icon: 'wallet',
    keywords: ['comisiones', 'pagos', 'historial', 'factura', 'suscripción', 'cuenta'],
    blocks: [
      { type: 'heading', text: 'Comisiones' },
      {
        type: 'paragraph',
        text: 'MOVI puede aplicar comisiones o suscripciones según el rol (ej. conductores). Revisa tu panel de suscripción para detalles vigentes.',
      },
      { type: 'heading', text: 'Pagos' },
      {
        type: 'bullets',
        items: [
          'Los pagos de viajes se acuerdan entre pasajero y conductor.',
          'Conductores: consulta suscripción y estado de pago en la app.',
        ],
      },
      { type: 'heading', text: 'Historial' },
      {
        type: 'paragraph',
        text: 'Accede a Actividad para ver viajes completados, entregas y calificaciones.',
      },
      { type: 'heading', text: 'Facturas (próximamente)' },
      {
        type: 'paragraph',
        text: 'MOVI preparará facturación electrónica para comercios y conductores. Te avisaremos cuando esté disponible.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Seguridad y confianza',
    subtitle: 'Protégete en MOVI',
    icon: 'shield-checkmark',
    keywords: ['seguridad', 'fraude', 'otp', 'reportar', 'recuperar cuenta', 'confianza'],
    blocks: [
      { type: 'heading', text: 'Nunca compartas tu OTP' },
      {
        type: 'paragraph',
        text: 'MOVI nunca te pedirá el código por teléfono, WhatsApp o redes sociales. Solo ingrésalo en la app oficial.',
      },
      { type: 'heading', text: 'Identificar fraude' },
      {
        type: 'bullets',
        items: [
          'Desconfía de pagos fuera de la app.',
          'Verifica placa y nombre del conductor asignado.',
          'No entregues documentos por canales no oficiales.',
        ],
      },
      { type: 'heading', text: 'Reportar usuarios o conductores' },
      {
        type: 'paragraph',
        text: 'Usa soporte con ID del viaje, fecha y descripción. MOVI revisa reportes y puede suspender cuentas.',
      },
      { type: 'heading', text: 'Recuperar cuenta' },
      {
        type: 'bullets',
        items: [
          'Si perdiste acceso al teléfono, contacta soporte con DUI (si aplica).',
          'Validaremos identidad antes de actualizar tu número.',
        ],
      },
    ],
  },
  {
    id: 'owner-guide',
    title: 'Dueño y proveedor',
    subtitle: 'Flota, vehículos y conductores',
    icon: 'people',
    keywords: ['dueño', 'proveedor', 'vehículos', 'conductores', 'dui', 'documentos'],
    blocks: [
      { type: 'heading', text: 'Registro con DUI' },
      {
        type: 'bullets',
        items: [
          'Crea cuenta como dueño/proveedor con DUI verificado.',
          'Sube documentos del vehículo y del titular.',
          'Espera aprobación del equipo MOVI.',
        ],
      },
      { type: 'heading', text: 'Operación' },
      {
        type: 'bullets',
        items: [
          'Agrega vehículos y asigna conductores.',
          'Genera códigos de invitación para conductores.',
          'Revisa reportes y estado de verificaciones.',
        ],
      },
    ],
  },
  {
    id: 'payments-guide',
    title: 'Pagos y suscripciones',
    subtitle: 'Qué verás en la app',
    icon: 'wallet',
    keywords: ['pagos', 'suscripción', 'cobro', 'mrr', 'placeholder'],
    blocks: [
      {
        type: 'paragraph',
        text: 'MOVI muestra precios acordados entre pasajero y conductor. Los pagos en app pueden estar en modo demostración hasta integrar pasarela oficial.',
      },
      { type: 'heading', text: 'Conductores' },
      {
        type: 'bullets',
        items: [
          'Suscripción de conductor puede aparecer en gracia o activa.',
          'Los cobros de viaje se acuerdan según política local.',
        ],
      },
      { type: 'heading', text: 'Pendiente en producción' },
      {
        type: 'bullets',
        items: [
          'Procesamiento de tarjetas y wallets.',
          'Reembolsos automáticos vía pasarela.',
          'Facturación electrónica comercial.',
        ],
      },
    ],
  },
  {
    id: 'admin-guide',
    title: 'Panel administrativo',
    subtitle: 'Operaciones, soporte y seguridad',
    icon: 'shield-checkmark',
    keywords: ['admin', 'operaciones', 'kpi', 'dispatch', 'auditoría'],
    blocks: [
      { type: 'heading', text: 'SUPER ADMIN' },
      {
        type: 'paragraph',
        text: 'Acceso total: operaciones live, viajes, soporte, finanzas, seguridad, auditoría y verificaciones.',
      },
      { type: 'heading', text: 'Roles limitados' },
      {
        type: 'bullets',
        items: [
          'OPS: dispatch, cancelaciones, alertas y mapa live.',
          'SOPORTE: tickets e historial de usuarios.',
          'FINANZAS: pagos, suscripciones y reportes.',
          'COMPLIANCE: verificaciones, seguridad y auditoría.',
        ],
      },
    ],
  },
  {
    id: 'faq',
    title: 'Preguntas frecuentes',
    subtitle: 'Respuestas rápidas',
    icon: 'help-circle',
    keywords: ['faq', 'preguntas', 'otp', 'conductor', 'cancelar', 'reembolso', 'documentos'],
    blocks: [
      { type: 'heading', text: '¿Cómo recibo mi código OTP?' },
      { type: 'paragraph', text: 'Al registrar o iniciar sesión recibirás un SMS con 6 dígitos.' },
      { type: 'heading', text: '¿Qué hago si no llega el código?' },
      { type: 'paragraph', text: 'Verifica señal, espera 2 minutos y reenvía. Contacta soporte si persiste.' },
      { type: 'heading', text: '¿Cómo me convierto en conductor?' },
      { type: 'paragraph', text: 'Regístrate como operador de unidad o con código de invitación.' },
      { type: 'heading', text: '¿Cómo cancelo un viaje?' },
      { type: 'paragraph', text: 'Desde la pantalla activa del viaje, opción Cancelar.' },
      { type: 'heading', text: '¿Cómo solicito reembolso?' },
      { type: 'paragraph', text: 'Contacta soporte con ID de viaje, monto y motivo.' },
    ],
  },
  {
    id: 'support',
    title: 'Contacto y soporte',
    subtitle: 'Estamos para ayudarte',
    icon: 'headset',
    keywords: ['soporte', 'contacto', 'whatsapp', 'correo', 'ayuda', 'formulario'],
    blocks: [
      { type: 'heading', text: 'Canales disponibles' },
      {
        type: 'bullets',
        items: HELP_SUPPORT_CHANNELS.map((c) => `${c.label}: ${c.value}`),
      },
      { type: 'heading', text: 'Formulario' },
      {
        type: 'paragraph',
        text: 'Usa el formulario al final de esta sección. Las consultas se registran para seguimiento (integración con ticketing próximamente).',
      },
    ],
  },
];

export function getHelpSection(id: string): HelpSection | undefined {
  return HELP_SECTIONS.find((s) => s.id === id);
}

export function getHelpSectionPlainText(section: HelpSection): string {
  return section.blocks
    .map((block) => {
      if (block.type === 'paragraph' || block.type === 'heading') return block.text;
      if (block.type === 'bullets') return block.items.join(' ');
      return block.steps.map((s) => `${s.title} ${s.description}`).join(' ');
    })
    .join(' ');
}
