/**
 * Arquitectura de pagos MOVI — suscripción $7/mes por conductor.
 * Proveedores preparados para integración futura (sin cobro real en mock).
 */

export type PaymentProviderId = 'wompi' | 'bac' | 'banco_agricola' | 'stripe' | 'mock';

export type PaymentMethodBrand =
  | 'visa_debit'
  | 'visa_credit'
  | 'mastercard_debit'
  | 'mastercard_credit';

export interface PaymentProviderConfig {
  id: PaymentProviderId;
  displayName: string;
  enabled: boolean;
  supportsSubscription: boolean;
  supportedMethods: PaymentMethodBrand[];
}

export const PAYMENT_PROVIDERS: PaymentProviderConfig[] = [
  {
    id: 'wompi',
    displayName: 'Wompi',
    enabled: false,
    supportsSubscription: true,
    supportedMethods: ['visa_debit', 'visa_credit', 'mastercard_debit', 'mastercard_credit'],
  },
  {
    id: 'bac',
    displayName: 'BAC',
    enabled: false,
    supportsSubscription: true,
    supportedMethods: ['visa_debit', 'visa_credit', 'mastercard_debit', 'mastercard_credit'],
  },
  {
    id: 'banco_agricola',
    displayName: 'Banco Agrícola',
    enabled: false,
    supportsSubscription: true,
    supportedMethods: ['visa_debit', 'visa_credit'],
  },
  {
    id: 'stripe',
    displayName: 'Stripe',
    enabled: false,
    supportsSubscription: true,
    supportedMethods: ['visa_debit', 'visa_credit', 'mastercard_debit', 'mastercard_credit'],
  },
  {
    id: 'mock',
    displayName: 'Demo (desarrollo)',
    enabled: true,
    supportsSubscription: true,
    supportedMethods: ['visa_debit', 'visa_credit', 'mastercard_debit', 'mastercard_credit'],
  },
];

export function getActivePaymentProvider(): PaymentProviderConfig {
  return PAYMENT_PROVIDERS.find((p) => p.enabled) ?? PAYMENT_PROVIDERS[PAYMENT_PROVIDERS.length - 1];
}
