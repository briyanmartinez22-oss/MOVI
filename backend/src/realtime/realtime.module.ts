import { Global, Module } from '@nestjs/common';
import { TripHubService } from './trip-hub.service';

@Global()
@Module({
  providers: [TripHubService],
  exports: [TripHubService],
})
export class RealtimeModule {}
