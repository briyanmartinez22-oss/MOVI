import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { OperationsLiveController } from './operations-live.controller';

@Module({
  imports: [RealtimeModule],
  controllers: [OperationsLiveController],
})
export class OperationsLiveModule {}
