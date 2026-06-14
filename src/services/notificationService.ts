export type NotificationType =
  | 'new_request'
  | 'new_offer'
  | 'offer_accepted'
  | 'driver_arrived'
  | 'trip_started'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'message';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  userId?: string;
}

const notifications: AppNotification[] = [];

export function pushNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): AppNotification {
  const item: AppNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(item);
  return item;
}

export function getNotifications(userId?: string): AppNotification[] {
  if (!userId) return [...notifications];
  return notifications.filter((n) => !n.userId || n.userId === userId);
}

export function markNotificationRead(id: string): void {
  const item = notifications.find((n) => n.id === id);
  if (item) item.read = true;
}

export function markAllRead(userId?: string): void {
  notifications.forEach((n) => {
    if (!userId || n.userId === userId) n.read = true;
  });
}

export const NotificationTemplates = {
  newRequest: (userId?: string) =>
    pushNotification({
      type: 'new_request',
      title: 'Nueva solicitud',
      body: 'Un pasajero solicita viaje cerca de ti.',
      userId,
    }),
  newOffer: (userId?: string) =>
    pushNotification({
      type: 'new_offer',
      title: 'Nueva oferta',
      body: 'Recibiste una oferta de un conductor.',
      userId,
    }),
  offerAccepted: (userId?: string) =>
    pushNotification({
      type: 'offer_accepted',
      title: 'Oferta aceptada',
      body: 'Tu oferta fue aceptada.',
      userId,
    }),
  offerAcceptedForDriver: (driverUserId: string, passengerName: string) =>
    pushNotification({
      type: 'offer_accepted',
      title: '¡Viaje aceptado!',
      body: `${passengerName} aceptó tu oferta. Ve al punto de recogida.`,
      userId: driverUserId,
    }),
  offerAcceptedForPassenger: (passengerUserId: string, driverName: string) =>
    pushNotification({
      type: 'offer_accepted',
      title: 'Conductor asignado',
      body: `${driverName} va en camino hacia ti.`,
      userId: passengerUserId,
    }),
  driverArrived: (userId?: string) =>
    pushNotification({
      type: 'driver_arrived',
      title: 'Conductor llegó',
      body: 'Tu conductor está en el punto de recogida.',
      userId,
    }),
  tripStarted: (userId?: string) =>
    pushNotification({
      type: 'trip_started',
      title: 'Viaje iniciado',
      body: 'El viaje ha comenzado.',
      userId,
    }),
  tripCompleted: (userId?: string) =>
    pushNotification({
      type: 'trip_completed',
      title: 'Viaje completado',
      body: 'El viaje finalizó correctamente.',
      userId,
    }),
  tripCancelled: (userId?: string) =>
    pushNotification({
      type: 'trip_cancelled',
      title: 'Viaje cancelado',
      body: 'El viaje fue cancelado.',
      userId,
    }),
};
