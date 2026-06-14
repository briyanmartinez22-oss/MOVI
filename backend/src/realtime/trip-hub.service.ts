import { Injectable } from '@nestjs/common';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { verifyAuthToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import {
  addChatMessage,
  getEligibleDriverUserIds,
  getTripById,
  serializeTrip,
  updateDriverLocation,
} from '../services/tripService';

type ClientState = {
  userId?: string;
  role?: string;
  driverId?: string;
  tripIds: Set<string>;
};

@Injectable()
export class TripHubService {
  private readonly tripSubscribers = new Map<string, Set<WebSocket>>();
  private readonly onlineDriverSockets = new Map<string, Set<WebSocket>>();
  private readonly clientState = new WeakMap<WebSocket, ClientState>();

  attach(server: HttpServer) {
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
      ws.on('message', async (raw) => {
        try {
          const body = JSON.parse(String(raw)) as Record<string, unknown>;
          const type = String(body.type ?? '');

          if (type === 'auth') {
            const token = this.extractToken(req, body);
            if (!token) {
              ws.send(JSON.stringify({ type: 'error', error: 'Token requerido' }));
              return;
            }
            const payload = verifyAuthToken(token);
            if (!payload) {
              ws.send(JSON.stringify({ type: 'error', error: 'Token inválido' }));
              return;
            }
            const state = this.getClient(ws);
            state.userId = payload.userId;
            state.role = payload.role;
            ws.send(
              JSON.stringify({ type: 'auth_ok', userId: payload.userId, role: payload.role })
            );
            return;
          }

          if (type === 'driver_online') {
            const state = this.getClient(ws);
            if (!state.userId || state.role !== 'driver') {
              ws.send(JSON.stringify({ type: 'error', error: 'Solo conductores pueden conectarse' }));
              return;
            }

            const driverId = String(body.driverId ?? '');
            const driver = await prisma.driver.findUnique({ where: { userId: state.userId } });
            if (!driver || driver.id !== driverId) {
              ws.send(JSON.stringify({ type: 'error', error: 'Conductor no válido' }));
              return;
            }

            const activeSession = await prisma.driverSession.findFirst({
              where: { driverId, disconnectedAt: null },
            });
            if (!activeSession) {
              ws.send(JSON.stringify({ type: 'error', error: 'Sin sesión activa' }));
              return;
            }

            state.driverId = driverId;
            this.registerOnlineDriver(state.userId, ws);
            ws.send(JSON.stringify({ type: 'driver_online_ok', driverId }));
            return;
          }

          if (type === 'driver_offline') {
            const state = this.getClient(ws);
            if (state.userId) {
              this.unregisterOnlineDriver(state.userId, ws);
            }
            state.driverId = undefined;
            ws.send(JSON.stringify({ type: 'driver_offline_ok' }));
            return;
          }

          if (type === 'subscribe_trip') {
            const tripId = String(body.tripId ?? '');
            if (!tripId) {
              ws.send(JSON.stringify({ type: 'error', error: 'tripId requerido' }));
              return;
            }

            const token = this.extractToken(req, body);
            if (token) {
              const payload = verifyAuthToken(token);
              if (payload) {
                const state = this.getClient(ws);
                state.userId = payload.userId;
                state.role = payload.role;
              }
            }

            this.subscribe(ws, tripId);
            const trip = await getTripById(tripId);
            ws.send(JSON.stringify({ type: 'subscribed', tripId, payload: trip }));
            return;
          }

          if (type === 'send_chat') {
            const state = this.getClient(ws);
            if (!state.userId || !state.role) {
              ws.send(JSON.stringify({ type: 'error', error: 'Autenticación requerida' }));
              return;
            }

            const tripId = String(body.tripId ?? '');
            const text = String(body.text ?? '').trim();
            if (!tripId || !text) {
              ws.send(JSON.stringify({ type: 'error', error: 'tripId y text requeridos' }));
              return;
            }

            const senderName = await this.resolveSenderName(state.userId, state.role);
            const result = await addChatMessage(
              tripId,
              state.userId,
              state.role,
              senderName,
              text
            );
            if (!result.ok) {
              ws.send(JSON.stringify({ type: 'error', error: result.error }));
              return;
            }

            this.broadcastToTrip(tripId, 'chat_message', result.message);
            return;
          }

          if (type === 'driver_location') {
            const state = this.getClient(ws);
            if (!state.userId) {
              ws.send(JSON.stringify({ type: 'error', error: 'Autenticación requerida' }));
              return;
            }

            const tripId = String(body.tripId ?? '');
            const lat = Number(body.lat);
            const lng = Number(body.lng);
            if (!tripId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
              ws.send(JSON.stringify({ type: 'error', error: 'tripId, lat y lng requeridos' }));
              return;
            }

            const result = await updateDriverLocation(tripId, state.userId, lat, lng);
            if (!result.ok) {
              ws.send(JSON.stringify({ type: 'error', error: result.error }));
              return;
            }

            this.broadcastToTrip(tripId, 'driver_location', { tripId, ...result.location });
            return;
          }

          ws.send(JSON.stringify({ type: 'error', error: `Tipo de mensaje desconocido: ${type}` }));
        } catch {
          ws.send(JSON.stringify({ type: 'error', error: 'Mensaje JSON inválido' }));
        }
      });

      ws.on('close', () => {
        const state = this.clientState.get(ws);
        if (state?.userId) {
          this.unregisterOnlineDriver(state.userId, ws);
        }
        this.unsubscribeAll(ws);
      });
    });

    console.log('WebSocket trip hub attached at /ws');
    return wss;
  }

  broadcastToTrip(tripId: string, event: string, payload: unknown) {
    const subs = this.tripSubscribers.get(tripId);
    if (!subs?.size) return;

    const message = JSON.stringify({ type: event, tripId, payload });
    for (const ws of subs) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  }

  async broadcastNewTripRequest(tripId: string) {
    const trip = await serializeTrip(tripId);
    if (!trip) return;

    const eligibleUserIds = await getEligibleDriverUserIds();
    for (const userId of eligibleUserIds) {
      this.sendToDriverUser(userId, 'request_new', trip);
    }
  }

  sendToDriverUser(userId: string, event: string, payload: unknown) {
    const sockets = this.onlineDriverSockets.get(userId);
    if (!sockets?.size) return;

    const message = JSON.stringify({ type: event, payload });
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  }

  async emitTripUpdated(tripId: string) {
    const trip = await serializeTrip(tripId);
    if (trip) this.broadcastToTrip(tripId, 'trip_updated', trip);
  }

  private registerOnlineDriver(userId: string, ws: WebSocket) {
    let sockets = this.onlineDriverSockets.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.onlineDriverSockets.set(userId, sockets);
    }
    sockets.add(ws);
  }

  private unregisterOnlineDriver(userId: string, ws: WebSocket) {
    const sockets = this.onlineDriverSockets.get(userId);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) {
      this.onlineDriverSockets.delete(userId);
    }
  }

  private getClient(ws: WebSocket): ClientState {
    let state = this.clientState.get(ws);
    if (!state) {
      state = { tripIds: new Set() };
      this.clientState.set(ws, state);
    }
    return state;
  }

  private subscribe(ws: WebSocket, tripId: string) {
    const state = this.getClient(ws);
    state.tripIds.add(tripId);
    let subs = this.tripSubscribers.get(tripId);
    if (!subs) {
      subs = new Set();
      this.tripSubscribers.set(tripId, subs);
    }
    subs.add(ws);
  }

  private unsubscribeAll(ws: WebSocket) {
    const state = this.clientState.get(ws);
    if (!state) return;
    for (const tripId of state.tripIds) {
      this.tripSubscribers.get(tripId)?.delete(ws);
    }
    state.tripIds.clear();
  }

  private extractToken(req: IncomingMessage, body: Record<string, unknown>): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    if (typeof body.token === 'string') return body.token;
    const url = new URL(req.url ?? '/', 'http://localhost');
    return url.searchParams.get('token');
  }

  private async resolveSenderName(userId: string, role: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user.fullName;
    return role;
  }
}
