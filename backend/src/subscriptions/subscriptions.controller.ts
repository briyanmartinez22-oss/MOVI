import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { getPaymentProvider } from '../services/paymentProvider.service';
import { getSubscriptionForUser, markSubscriptionPaid } from '../services/subscription.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  @Get('me')
  async me(@AuthUser() auth: AuthPayload) {
    return { subscription: await getSubscriptionForUser(auth.userId) };
  }

  @Post('pay')
  async pay(@AuthUser() auth: AuthPayload) {
    const sub = await getSubscriptionForUser(auth.userId);
    if (!sub) {
      return { ok: false, error: 'No eres conductor' };
    }
    const provider = getPaymentProvider();
    const intent = await provider.createPaymentIntent({
      userId: auth.userId,
      amount: sub.monthlyAmountUsd,
      currency: 'USD',
    });
    await markSubscriptionPaid(sub.driverId, provider.name, 'demo');
    return { ok: true, provider: intent.provider, status: 'completed' };
  }
}
