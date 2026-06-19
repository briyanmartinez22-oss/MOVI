import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { ChatModule } from './chat/chat.module';
import { AppConfigModule } from './config/config.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { DriversModule } from './drivers/drivers.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OffersModule } from './offers/offers.module';
import { OwnersModule } from './owners/owners.module';
import { PassengersModule } from './passengers/passengers.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RatingsModule } from './ratings/ratings.module';
import { TripsModule } from './trips/trips.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RealtimeModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PassengersModule,
    OwnersModule,
    VehiclesModule,
    DriversModule,
    BusinessesModule,
    TripsModule,
    OffersModule,
    DeliveriesModule,
    SubscriptionsModule,
    PaymentsModule,
    NotificationsModule,
    ChatModule,
    LocationsModule,
    AdminModule,
    AnalyticsModule,
    RatingsModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
