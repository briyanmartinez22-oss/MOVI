import { TripType } from '../types';
import type { ServiceCategoryId } from '../data/serviceCategories';
import { getCategoryMinPrice, getServiceCategory } from '../data/serviceCategories';

export const PRICE_STEP = 0.5;
export const MAX_PRICE = 10;

export const MIN_PRICE: Record<TripType, number> = {
  shared: 0.5,
  private: 1.0,
};

/** @deprecated Prefer getCategoryMinPrice for passenger flows */
export function getMinPrice(tripType: TripType): number {
  return MIN_PRICE[tripType];
}

export function getMinPriceForTrip(
  tripType: TripType,
  categoryId?: ServiceCategoryId
): number {
  if (categoryId) {
    return getCategoryMinPrice(categoryId, tripType);
  }
  return getMinPrice(tripType);
}

export function clampPrice(
  price: number,
  tripType: TripType,
  categoryId?: ServiceCategoryId
): number {
  const min = getMinPriceForTrip(tripType, categoryId);
  const clamped = Math.min(MAX_PRICE, Math.max(min, price));
  return Math.round(clamped / PRICE_STEP) * PRICE_STEP;
}

export function incrementPrice(
  price: number,
  tripType: TripType,
  categoryId?: ServiceCategoryId
): number {
  return clampPrice(price + PRICE_STEP, tripType, categoryId);
}

export function decrementPrice(
  price: number,
  tripType: TripType,
  categoryId?: ServiceCategoryId
): number {
  return clampPrice(price - PRICE_STEP, tripType, categoryId);
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
