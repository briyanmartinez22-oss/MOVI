import { Module } from '@nestjs/common';
import { PassengersController } from './passengers.controller';

@Module({
  controllers: [PassengersController],
})
export class PassengersModule {}
