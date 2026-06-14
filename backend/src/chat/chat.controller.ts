import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { getChatMessages } from '../services/tripService';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class ChatController {
  @Get(':tripId/chat')
  async history(@Param('tripId') tripId: string) {
    return { messages: await getChatMessages(tripId) };
  }
}
