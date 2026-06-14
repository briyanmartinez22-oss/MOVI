import { TripType } from '../types';

export const PRICE_STEP = 0.5;
export const MAX_PRICE = 10;

export const MIN_PRICE: Record<TripType, number> = {
  shared: 0.5,
  private: 1.0,
};

export function getMinPrice(tripType: TripType): number {
  return MIN_PRICE[tripType];
}

export function clampPrice(price: number, tripType: TripType): number {
  const min = getMinPrice(tripType);
  const clamped = Math.min(MAX_PRICE, Math.max(min, price));
  return Math.round(clamped / PRICE_STEP) * PRICE_STEP;
}

export function incrementPrice(price: number, tripType: TripType): number {
  return clampPrice(price + PRICE_STEP, tripType);
}

export function decrementPrice(price: number, tripType: TripType): number {
  return clampPrice(price - PRICE_STEP, tripType);
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
