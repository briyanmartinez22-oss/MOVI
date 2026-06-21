import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAdminStaffRole, SUPPORT_ROLES } from '../services/admin-staff.service';
import {
  addSupportTicketMessage,
  createSupportTicket,
  getUserSupportHistory,
  listSupportTickets,
  updateSupportTicket,
} from '../services/support-admin.service';

type AuthRequest = Request & { auth?: AuthPayload };

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...SUPPORT_ROLES)
export class SupportController {
  @Get('tickets')
  async tickets(@Query('status') status?: string) {
    return { tickets: await listSupportTickets(status) };
  }

  @Post('tickets')
  async create(@Body() body: Record<string, string>, @Req() req: AuthRequest) {
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const userId = body.userId?.trim();
    const subject = body.subject?.trim();
    const description = body.description?.trim();
    if (!userId || !subject || !description) {
      throw new HttpException('userId, subject y description requeridos', HttpStatus.BAD_REQUEST);
    }
    const ticket = await createSupportTicket(
      {
        userId,
        subject,
        description,
        priority: (body.priority as 'low' | 'medium' | 'high' | 'urgent') ?? 'medium',
        category: body.category,
        tripId: body.tripId,
        driverId: body.driverId,
        businessId: body.businessId,
        assignedTo: body.assignedTo,
      },
      req.auth!.userId,
      actorRole
    );
    return { ticket };
  }

  @Patch('tickets/:id')
  async patch(
    @Param('id') id: string,
    @Body() body: Record<string, string>,
    @Req() req: AuthRequest
  ) {
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const result = await updateSupportTicket(
      id,
      {
        status: body.status as never,
        priority: body.priority as never,
        assignedTo: body.assignedTo,
      },
      req.auth!.userId,
      actorRole
    );
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return { ticket: result.ticket };
  }

  @Post('tickets/:id/messages')
  async message(
    @Param('id') id: string,
    @Body() body: { text?: string },
    @Req() req: AuthRequest
  ) {
    const text = body?.text?.trim();
    if (!text) throw new HttpException('text requerido', HttpStatus.BAD_REQUEST);
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const result = await addSupportTicketMessage(id, req.auth!.userId, actorRole, text);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return { message: result.message };
  }

  @Get('users/:userId/history')
  async history(@Param('userId') userId: string) {
    return { tickets: await getUserSupportHistory(userId) };
  }
}
