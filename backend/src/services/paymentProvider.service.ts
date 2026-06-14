export interface PaymentIntentInput {
  userId: string;
  amount: number;
  currency?: string;
  tripId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  provider: string;
  status: 'pending' | 'completed' | 'failed';
  providerPaymentId?: string;
  clientSecret?: string;
  checkoutUrl?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  confirmPayment(providerPaymentId: string): Promise<PaymentIntentResult>;
}

class DemoPaymentProvider implements PaymentProvider {
  readonly name = 'demo';

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      provider: this.name,
      status: 'pending',
      providerPaymentId: `demo_${Date.now()}`,
      clientSecret: 'demo_secret',
    };
  }

  async confirmPayment(providerPaymentId: string): Promise<PaymentIntentResult> {
    return { provider: this.name, status: 'completed', providerPaymentId };
  }
}

class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';

  async createPaymentIntent(_input: PaymentIntentInput): Promise<PaymentIntentResult> {
    throw new Error('Stripe no configurado. Agrega STRIPE_SECRET_KEY.');
  }

  async confirmPayment(_providerPaymentId: string): Promise<PaymentIntentResult> {
    throw new Error('Stripe no configurado.');
  }
}

const providers: Record<string, PaymentProvider> = {
  demo: new DemoPaymentProvider(),
  stripe: new StripePaymentProvider(),
};

export function getPaymentProvider(name = process.env.PAYMENT_PROVIDER ?? 'demo'): PaymentProvider {
  return providers[name] ?? providers.demo;
}
