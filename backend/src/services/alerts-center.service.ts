import type { OperationalAlertType, OperationalAlertSeverity } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseJsonField, stringifyJsonField } from '../utils/normalize';
import { haversineKm } from '../utils/geo';
import { writeAdminAudit } from './audit.service';

const ACTIVE_TRIP_STATUSES = [
  'accepted',
  'driver_arriving',
  'driver_arrived',
  'trip_started',
] as const;

type DetectedAlert = {
  type: OperationalAlertType;
  severity: OperationalAlertSeverity;
  entityType: string;
  entityId: string;
  message: string;
  metadata?: Record<string, unknown>;
};

function serializeAlert(row: {
  id: string;
  type: OperationalAlertType;
  severity: OperationalAlertSeverity;
  status: string;
  entityType: string;
  entityId: string;
  message: string;
  metadataJson: string;
  createdAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}) {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    status: row.status,
    entityType: row.entityType,
    entityId: row.entityId,
    message: row.message,
    metadata: parseJsonField(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    acknowledgedBy: row.acknowledgedBy,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedBy: row.resolvedBy,
  };
}

async function detectAlerts(): Promise<DetectedAlert[]> {
  const now = Date.now();
  const alerts: DetectedAlert[] = [];

  const pendingTrips = await prisma.trip.findMany({
    where: { lifecycleStatus: { in: ['requested', 'offered'] } },
    include: { offers: true },
    take: 100,
  });

  for (const trip of pendingTrips) {
    const waitMin = (now - trip.createdAt.getTime()) / 60000;
    if (waitMin >= 5 && !trip.driverId && trip.offers.length === 0) {
      alerts.push({
        type: 'no_driver_timeout',
        severity: waitMin >= 10 ? 'critical' : 'warning',
        entityType: 'trip',
        entityId: trip.id,
        message: `${trip.passengerName}: sin conductor > ${Math.round(waitMin)} min`,
        metadata: { waitMinutes: waitMin },
      });
    }
    if (waitMin >= 5) {
      alerts.push({
        type: 'sla',
        severity: waitMin >= 10 ? 'critical' : 'warning',
        entityType: 'trip',
        entityId: trip.id,
        message: `Espera SLA ${Math.round(waitMin)} min`,
        metadata: { waitMinutes: waitMin },
      });
    }
  }

  const activeTrips = await prisma.trip.findMany({
    where: { lifecycleStatus: { in: [...ACTIVE_TRIP_STATUSES] } },
    take: 100,
  });

  for (const trip of activeTrips) {
    if (!trip.driverId) continue;

    const session = await prisma.driverSession.findFirst({
      where: { driverId: trip.driverId, disconnectedAt: null },
    });
    if (!session) {
      alerts.push({
        type: 'driver_disconnected',
        severity: 'critical',
        entityType: 'trip',
        entityId: trip.id,
        message: `Conductor desconectado durante viaje activo`,
        metadata: { driverId: trip.driverId },
      });
    }

    const lastPing = await prisma.locationPing.findFirst({
      where: { driverId: trip.driverId },
      orderBy: { createdAt: 'desc' },
    });
    if (lastPing) {
      const idleMin = (now - lastPing.createdAt.getTime()) / 60000;
      const speed = lastPing.speed ?? 0;
      if (idleMin >= 10 && speed < 1) {
        alerts.push({
          type: 'driver_stopped',
          severity: 'warning',
          entityType: 'driver',
          entityId: trip.driverId,
          message: `Conductor detenido > ${Math.round(idleMin)} min`,
          metadata: { tripId: trip.id, idleMinutes: idleMin },
        });
      }
      if (idleMin >= 15) {
        alerts.push({
          type: 'trip_no_movement',
          severity: 'critical',
          entityType: 'trip',
          entityId: trip.id,
          message: `Viaje sin movimiento > ${Math.round(idleMin)} min`,
          metadata: { driverId: trip.driverId },
        });
      }
    }

    const origin = parseJsonField<{ coordinates?: { latitude: number; longitude: number } }>(
      trip.originJson,
      {}
    );
    const oLat = trip.pickupLatitude ?? origin.coordinates?.latitude;
    const oLng = trip.pickupLongitude ?? origin.coordinates?.longitude;
    if (
      trip.driverLat != null &&
      trip.driverLng != null &&
      oLat != null &&
      oLng != null &&
      trip.lifecycleStatus === 'driver_arriving'
    ) {
      const dist = haversineKm(trip.driverLat, trip.driverLng, oLat, oLng);
      const etaExpected = Math.max(2, Math.round(dist * 3));
      const elapsedMin = trip.startedAt
        ? (now - trip.startedAt.getTime()) / 60000
        : (now - trip.createdAt.getTime()) / 60000;
      if (elapsedMin > etaExpected + 5) {
        alerts.push({
          type: 'eta_exceeded',
          severity: 'warning',
          entityType: 'trip',
          entityId: trip.id,
          message: `ETA excedido (${Math.round(elapsedMin)} min)`,
          metadata: { expectedEta: etaExpected, elapsedMin },
        });
      }
    }
  }

  const cancelRecent = await prisma.trip.groupBy({
    by: ['passengerId'],
    where: {
      lifecycleStatus: 'cancelled',
      cancelledAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
    },
    _count: { _all: true },
  });
  for (const row of cancelRecent) {
    if (row._count._all >= 3) {
      alerts.push({
        type: 'repeated_cancellations',
        severity: 'warning',
        entityType: 'passenger',
        entityId: row.passengerId,
        message: `${row._count._all} cancelaciones en 24h`,
        metadata: { count: row._count._all },
      });
    }
  }

  const otpFails = await prisma.otpChallenge.groupBy({
    by: ['phoneNumber'],
    where: {
      verified: false,
      createdAt: { gte: new Date(now - 60 * 60 * 1000) },
    },
    _count: { _all: true },
  });
  for (const row of otpFails) {
    if (row._count._all >= 3) {
      alerts.push({
        type: 'otp_failed_repeated',
        severity: 'critical',
        entityType: 'phone',
        entityId: row.phoneNumber,
        message: `OTP fallido x${row._count._all} en 1h`,
        metadata: { phone: row.phoneNumber },
      });
    }
  }

  const failedPayments = await prisma.payment.findMany({
    where: {
      status: 'failed',
      createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
    },
    take: 20,
  });
  for (const p of failedPayments) {
    alerts.push({
      type: 'payment_failed',
      severity: 'warning',
      entityType: 'payment',
      entityId: p.id,
      message: `Pago fallido $${p.amount}`,
      metadata: { userId: p.userId, tripId: p.tripId },
    });
  }

  const sosNotifications = await prisma.notification.findMany({
    where: {
      type: 'sos',
      createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
    },
    take: 10,
  });
  for (const n of sosNotifications) {
    alerts.push({
      type: 'sos_active',
      severity: 'critical',
      entityType: 'user',
      entityId: n.userId,
      message: n.title || 'SOS activo',
      metadata: parseJsonField(n.dataJson, {}),
    });
  }

  const zoneCounts = await prisma.trip.groupBy({
    by: ['pickupLatitude', 'pickupLongitude'],
    where: {
      lifecycleStatus: { in: ['requested', 'offered'] },
      pickupLatitude: { not: null },
    },
    _count: { _all: true },
  });
  for (const z of zoneCounts) {
    if (z._count._all >= 5 && z.pickupLatitude != null && z.pickupLongitude != null) {
      alerts.push({
        type: 'saturated_zone',
        severity: 'warning',
        entityType: 'zone',
        entityId: `${z.pickupLatitude},${z.pickupLongitude}`,
        message: `Zona saturada: ${z._count._all} solicitudes`,
        metadata: { lat: z.pickupLatitude, lng: z.pickupLongitude, count: z._count._all },
      });
    }
  }

  return alerts;
}

async function upsertDetectedAlerts(detected: DetectedAlert[]) {
  for (const a of detected) {
    const existing = await prisma.operationalAlert.findFirst({
      where: {
        type: a.type,
        entityId: a.entityId,
        status: { in: ['open', 'acknowledged'] },
      },
    });
    if (!existing) {
      await prisma.operationalAlert.create({
        data: {
          type: a.type,
          severity: a.severity,
          entityType: a.entityType,
          entityId: a.entityId,
          message: a.message,
          metadataJson: stringifyJsonField(a.metadata ?? {}),
        },
      });
    } else if (existing.severity !== a.severity) {
      await prisma.operationalAlert.update({
        where: { id: existing.id },
        data: { severity: a.severity, message: a.message },
      });
    }
  }
}

export async function listOperationalAlerts(status?: string) {
  await upsertDetectedAlerts(await detectAlerts());

  const where =
    status && status !== 'all'
      ? { status: status as 'open' | 'acknowledged' | 'resolved' }
      : { status: { in: ['open', 'acknowledged'] as ('open' | 'acknowledged')[] } };

  const rows = await prisma.operationalAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return rows.map(serializeAlert);
}

export async function acknowledgeAlert(alertId: string, adminUserId: string, actorRole?: string) {
  const alert = await prisma.operationalAlert.findUnique({ where: { id: alertId } });
  if (!alert) return { ok: false as const, error: 'Alerta no encontrada' };
  if (alert.status === 'resolved') {
    return { ok: false as const, error: 'Alerta ya resuelta' };
  }

  const updated = await prisma.operationalAlert.update({
    where: { id: alertId },
    data: {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      acknowledgedBy: adminUserId,
    },
  });

  void writeAdminAudit({
    userId: adminUserId,
    actorRole,
    action: 'ack_alert',
    entityType: 'operational_alert',
    entityId: alertId,
    before: { status: alert.status },
    after: { status: 'acknowledged' },
  });

  return { ok: true as const, alert: serializeAlert(updated) };
}

export async function resolveAlert(alertId: string, adminUserId: string, actorRole?: string) {
  const alert = await prisma.operationalAlert.findUnique({ where: { id: alertId } });
  if (!alert) return { ok: false as const, error: 'Alerta no encontrada' };

  const updated = await prisma.operationalAlert.update({
    where: { id: alertId },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: adminUserId,
    },
  });

  void writeAdminAudit({
    userId: adminUserId,
    actorRole,
    action: 'resolve_alert',
    entityType: 'operational_alert',
    entityId: alertId,
    before: { status: alert.status },
    after: { status: 'resolved' },
  });

  return { ok: true as const, alert: serializeAlert(updated) };
}
