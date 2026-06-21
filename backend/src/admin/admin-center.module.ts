import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { AlertsController } from './alerts.controller';
import { AuditController } from './audit.controller';
import { AdminMeController } from './admin-me.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminRatingsController } from './admin-ratings.controller';
import { FinanceController } from './finance.controller';
import { OperationsLiveController } from './operations-live.controller';
import { SecurityController } from './security.controller';
import { SupportController } from './support.controller';
import { SuperAdminController } from './super-admin.controller';
import { TripsAdminController } from './trips-admin.controller';
import { AdminEntitiesController } from './admin-entities.controller';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';

@Module({
  imports: [RealtimeModule],
  controllers: [
    AdminMeController,
    AdminUsersController,
    AdminRatingsController,
    OperationsLiveController,
    AlertsController,
    SupportController,
    FinanceController,
    SecurityController,
    AuditController,
    TripsAdminController,
    SuperAdminController,
    AdminEntitiesController,
  ],
  providers: [AdminStaffGuard],
})
export class AdminCenterModule {}
