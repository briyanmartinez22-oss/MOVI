import { Module } from '@nestjs/common';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [AdminStaffGuard],
})
export class AdminModule {}
