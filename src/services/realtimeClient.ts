import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWsUrl, useMockApi } from '../config/env';
import { SESSION_KEYS } from './authService';

export type RealtimeEventType =
  | 'trip_updated'
  | 'offer_created'
  | 'offer_accepted'
  | 'chat_message'
  | 'driver_location'
  | 'request_new';

type RealtimeListener = (payload: unknown) => void;

interface OutboundMessage {
  type: string;
  tripId?: string;
  text?: string;
  lat?: number;
  lng?: number;
  token?: string;
  driverId?: string;
}

const RECONNECT_MS = 3000;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<RealtimeEventType, Set<RealtimeListener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribedTrips = new Set<string>();
  private connecting = false;
  private shouldReconnect = true;
  private authToken: string | null = null;
  private onlineDriverId: string | null = null;

  isEnabled(): boolean {
    return !useMockApi();
  }

  async connect(): Promise<void> {
    if (useMockApi() || this.connecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.connecting = true;
    this.shouldReconnect = true;
    this.authToken = await AsyncStorage.getItem(SESSION_KEYS.authToken);

    try {
      const baseUrl = getWsUrl();
      const url = this.authToken
        ? `${baseUrl}?token=${encodeURIComponent(this.authToken)}`
        : baseUrl;
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        this.connecting = false;
        if (this.authToken) {
          this.send({ type: 'auth', token: this.authToken });
        }
        if (this.onlineDriverId) {
          this.send({ type: 'driver_online', driverId: this.onlineDriverId });
        }
        for (const tripId of this.subscribedTrips) {
          this.send({ type: 'subscribe_trip', tripId });
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as {
            type?: RealtimeEventType | 'subscribed' | 'auth_ok' | 'error';
            payload?: unknown;
          };
          if (data.type && this.listeners.has(data.type as RealtimeEventType)) {
            this.listeners
              .get(data.type as RealtimeEventType)
              ?.forEach((listener) => listener(data.payload));
          }
        } catch {
          /* ignore malformed messages */
        }
      };

      socket.onclose = () => {
        this.connecting = false;
        this.ws = null;
        if (this.shouldReconnect && !useMockApi()) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {
      this.connecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.onlineDriverId) {
      this.send({ type: 'driver_offline' });
      this.onlineDriverId = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.subscribedTrips.clear();
  }

  setDriverOnline(driverId: string): void {
    this.onlineDriverId = driverId;
    this.send({ type: 'driver_online', driverId });
    void this.connect();
  }

  setDriverOffline(): void {
    if (this.onlineDriverId) {
      this.send({ type: 'driver_offline' });
      this.onlineDriverId = null;
    }
  }

  subscribeTrip(tripId: string): void {
    this.subscribedTrips.add(tripId);
    this.send({ type: 'subscribe_trip', tripId });
    void this.connect();
  }

  unsubscribeTrip(tripId: string): void {
    this.subscribedTrips.delete(tripId);
  }

  sendChat(tripId: string, text: string): void {
    this.send({ type: 'send_chat', tripId, text });
  }

  sendDriverLocation(tripId: string, lat: number, lng: number): void {
    this.send({ type: 'driver_location', tripId, lat, lng });
  }

  on(event: RealtimeEventType, listener: RealtimeListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: RealtimeEventType, listener: RealtimeListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private send(message: OutboundMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return;
    }
    void this.connect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_MS);
  }
}

export const realtimeClient = new RealtimeClient();
