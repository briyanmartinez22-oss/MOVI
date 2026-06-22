import { Module } from '@nestjs/common';
import { AdminVehicleInvitesController, DriversController } from './drivers.controller';

@Module({
  controllers: [DriversController, AdminVehicleInvitesController],
})
export class DriversModule {}
