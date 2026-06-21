import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import {
  createNotification,
  listNotifications,
  markNotificationRead,
  registerPushToken,
} from '../services/notification.service';

const pushTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android', 'web', 'unknown']),
  deviceId: z.string().optional(),
});

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  @Post('push-token')
  async pushToken(@AuthUser() auth: AuthPayload, @Body() body: unknown) {
    const parsed = pushTokenSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Token push inválido', HttpStatus.BAD_REQUEST);
    }
    await registerPushToken(
      auth.userId,
      parsed.data.token,
      parsed.data.platform,
      parsed.data.deviceId
    );
    return { registered: true };
  }

  @Get()
  async list(@AuthUser() auth: AuthPayload) {
    return { notifications: await listNotifications(auth.userId) };
  }

  @Post(':id/read')
  async read(@AuthUser() auth: AuthPayload, @Param('id') id: string) {
    await markNotificationRead(auth.userId, id);
    return { read: true };
  }

  @Post('test')
  async test(@AuthUser() auth: AuthPayload) {
    await createNotification(auth.userId, 'system', 'MOVI', 'Notificación de prueba');
    return { sent: true };
  }
}
