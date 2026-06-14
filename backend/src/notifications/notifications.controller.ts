import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import {
  createNotification,
  listNotifications,
  markNotificationRead,
  registerPushToken,
} from '../services/notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  @Post('push-token')
  async pushToken(@AuthUser() auth: AuthPayload, @Body() body: { token: string; platform: string; deviceId?: string }) {
    await registerPushToken(auth.userId, body.token, body.platform, body.deviceId);
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
