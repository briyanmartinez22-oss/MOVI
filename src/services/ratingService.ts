import { apiPost, apiGet } from './api/client';

export interface TripRatingInput {
  tripId: string;
  stars: number;
  comment?: string;
  raterRole: 'passenger' | 'driver';
}

export interface TripRatingRecord {
  id: string;
  tripId: string;
  raterId: string;
  raterRole: string;
  rateeId: string;
  rateeRole: string;
  stars: number;
  comment?: string;
  createdAt: string;
}

export async function submitTripRating(input: TripRatingInput) {
  const res = await apiPost<TripRatingRecord>(`/trips/${input.tripId}/ratings`, {
    stars: input.stars,
    comment: input.comment,
    raterRole: input.raterRole,
  });
  return res;
}

export async function fetchTripRatings(tripId: string) {
  const res = await apiGet<{ ratings: TripRatingRecord[] }>(`/trips/${tripId}/ratings`);
  return res.ok ? res.data?.ratings ?? [] : [];
}
