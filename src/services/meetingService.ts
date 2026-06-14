import type { Coordinates } from '../types';

/** Datos efímeros para facilitar encuentro — no persisten en AsyncStorage. */
export interface MeetingShare {
  tripId: string;
  driverId: string;
  photoUri?: string;
  description?: string;
  liveLocation?: Coordinates;
  sharedAt: string;
}

const ephemeralByTrip = new Map<string, MeetingShare>();

export function setMeetingShare(tripId: string, driverId: string, data: Partial<MeetingShare>): MeetingShare {
  const existing = ephemeralByTrip.get(tripId);
  const share: MeetingShare = {
    tripId,
    driverId,
    sharedAt: new Date().toISOString(),
    ...existing,
    ...data,
  };
  ephemeralByTrip.set(tripId, share);
  return share;
}

export function getMeetingShareForDriver(tripId: string, driverId: string): MeetingShare | null {
  const share = ephemeralByTrip.get(tripId);
  if (!share || share.driverId !== driverId) return null;
  return share;
}

export function clearMeetingShare(tripId: string): void {
  ephemeralByTrip.delete(tripId);
}

export function clearAllMeetingShares(): void {
  ephemeralByTrip.clear();
}
