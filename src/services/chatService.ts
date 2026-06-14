import { useMockApi } from './api/config';
import { fetchChatMessages } from './api';
import { realtimeClient } from './realtimeClient';

export type ChatSenderRole = 'passenger' | 'driver' | 'business';

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderRole: ChatSenderRole;
  text: string;
  createdAt: string;
}

const messages: ChatMessage[] = [];
const listeners = new Set<(tripId: string) => void>();

function notify(tripId: string): void {
  listeners.forEach((listener) => listener(tripId));
}

function upsertMessage(msg: ChatMessage): void {
  const idx = messages.findIndex((m) => m.id === msg.id);
  if (idx >= 0) {
    messages[idx] = msg;
  } else {
    messages.push(msg);
  }
  notify(msg.tripId);
}

let realtimeInitialized = false;

function ensureRealtimeListeners(): void {
  if (realtimeInitialized || useMockApi()) return;
  realtimeInitialized = true;

  realtimeClient.on('chat_message', (payload) => {
    const data = payload as Partial<ChatMessage> & { createdAt?: number | string };
    if (!data.tripId || !data.text) return;
    const createdAt =
      typeof data.createdAt === 'number'
        ? new Date(data.createdAt).toISOString()
        : data.createdAt ?? new Date().toISOString();
    upsertMessage({
      id: data.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tripId: data.tripId,
      senderId: data.senderId ?? 'unknown',
      senderRole: (data.senderRole as ChatSenderRole) ?? 'passenger',
      text: data.text,
      createdAt,
    });
  });
}

export function subscribeChatMessages(listener: (tripId: string) => void): () => void {
  ensureRealtimeListeners();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getChatMessages(tripId: string): ChatMessage[] {
  return messages
    .filter((m) => m.tripId === tripId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function loadChatHistory(tripId: string): Promise<void> {
  if (useMockApi()) return;
  const res = await fetchChatMessages(tripId);
  if (!res.ok || !res.data?.length) return;
  for (const msg of res.data) {
    upsertMessage({
      id: msg.id,
      tripId: msg.tripId,
      senderId: msg.senderId,
      senderRole: (msg.senderRole as ChatSenderRole) ?? 'passenger',
      text: msg.text,
      createdAt: new Date(msg.createdAt).toISOString(),
    });
  }
}

export function sendChatMessage(
  tripId: string,
  senderId: string,
  senderRole: ChatSenderRole,
  text: string
): ChatMessage {
  ensureRealtimeListeners();

  const msg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tripId,
    senderId,
    senderRole,
    text,
    createdAt: new Date().toISOString(),
  };

  if (!useMockApi()) {
    realtimeClient.sendChat(tripId, text);
    const optimistic: ChatMessage = { ...msg };
    messages.push(optimistic);
    notify(tripId);
    return optimistic;
  }

  messages.push(msg);
  notify(tripId);
  return msg;
}

export function resolveChatSenderRole(
  userRole: string | undefined,
  tripKind?: string
): ChatSenderRole {
  if (userRole === 'driver') return 'driver';
  if (userRole === 'business' || tripKind === 'delivery' || tripKind === 'personal_delivery') {
    return 'business';
  }
  return 'passenger';
}

const CHAT_PASSENGER_LINES = [
  'Hola, ya estoy en el punto.',
  '¿Cuánto falta para llegar?',
  'Voy de camisa roja junto a la farmacia.',
  'Perfecto, gracias.',
];
const CHAT_DRIVER_LINES = [
  'Hola, voy en camino.',
  'Llego en 3 minutos.',
  'Ya estoy cerca del punto de recogida.',
  'Listo, estoy afuera.',
];
const CHAT_BUSINESS_LINES = [
  'El pedido está listo en mostrador.',
  'Favor recoger en la entrada principal.',
  'Cliente espera en la dirección indicada.',
];

export function clearDemoChats(): void {
  messages.length = 0;
}

/** Pobla chats demo para viajes y entregas (simulación producción). */
export function seedDemoChatMessages(
  tripIds: string[],
  deliveryIds: string[],
  rng: () => number
): void {
  if (!useMockApi()) return;
  clearDemoChats();
  const pickLine = (lines: string[]) => lines[Math.floor(rng() * lines.length)];

  tripIds.forEach((tripId, i) => {
    const base = Date.now() - (i + 1) * 600000;
    sendChatMessage(tripId, 'seed-driver', 'driver', pickLine(CHAT_DRIVER_LINES));
    const pMsg = {
      id: `msg-p-${tripId}-1`,
      tripId,
      senderId: 'seed-passenger',
      senderRole: 'passenger' as const,
      text: pickLine(CHAT_PASSENGER_LINES),
      createdAt: new Date(base + 120000).toISOString(),
    };
    messages.push(pMsg);
    if (rng() > 0.4) {
      messages.push({
        id: `msg-d-${tripId}-2`,
        tripId,
        senderId: 'seed-driver',
        senderRole: 'driver',
        text: pickLine(CHAT_DRIVER_LINES),
        createdAt: new Date(base + 240000).toISOString(),
      });
    }
  });

  deliveryIds.forEach((deliveryId, i) => {
    const base = Date.now() - (i + 1) * 900000;
    messages.push({
      id: `msg-bd-${deliveryId}`,
      tripId: deliveryId,
      senderId: 'seed-business',
      senderRole: 'business',
      text: pickLine(CHAT_BUSINESS_LINES),
      createdAt: new Date(base).toISOString(),
    });
    messages.push({
      id: `msg-dd-${deliveryId}`,
      tripId: deliveryId,
      senderId: 'seed-driver',
      senderRole: 'driver',
      text: 'Voy en camino con tu pedido.',
      createdAt: new Date(base + 180000).toISOString(),
    });
  });
}

export function seedChatIfEmpty(
  tripId: string,
  options?: { tripKind?: string; counterpartRole?: ChatSenderRole }
): void {
  if (useMockApi()) {
    if (getChatMessages(tripId).length > 0) return;

    const isDelivery =
      options?.tripKind === 'delivery' || options?.tripKind === 'personal_delivery';
    const driverSeed = isDelivery
      ? 'Hola, voy en camino con tu pedido.'
      : 'Hola, voy en camino al punto de recogida.';
    const businessSeed = 'Hola, el pedido está listo para recoger.';

    sendChatMessage(tripId, 'seed-driver', 'driver', driverSeed);
    if (isDelivery) {
      sendChatMessage(tripId, 'seed-business', 'business', businessSeed);
    }
  }
}
