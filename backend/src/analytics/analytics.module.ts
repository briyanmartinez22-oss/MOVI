import { Module } from '@nestjs/common';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [AdminStaffGuard],
})
export class AnalyticsModule {}
