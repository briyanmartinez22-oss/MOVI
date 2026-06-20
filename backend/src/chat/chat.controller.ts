import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { getChatMessages } from '../services/tripService';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class ChatController {
  @Get(':tripId/chat')
  async history(@Param('tripId') tripId: string, @AuthUser() auth: AuthPayload) {
    return { messages: await getChatMessages(tripId, auth.userId) };
  }
}
