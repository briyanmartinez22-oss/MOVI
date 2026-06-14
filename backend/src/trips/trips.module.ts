import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { TripsController } from './trips.controller';

@Module({
  imports: [RealtimeModule],
  controllers: [TripsController],
})
export class TripsModule {}
