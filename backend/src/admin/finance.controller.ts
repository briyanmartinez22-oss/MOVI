import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
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
import { getAdminStaffRole, FINANCE_ROLES } from '../services/admin-staff.service';
import {
  getFinanceSummary,
  listFinancePayments,
  listFinanceSubscriptions,
  requestFinanceRefund,
} from '../services/finance-admin.service';

type AuthRequest = Request & { auth?: AuthPayload };

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...FINANCE_ROLES)
export class FinanceController {
  @Get('summary')
  async summary() {
    return getFinanceSummary();
  }

  @Get('payments')
  async payments(@Query('limit') limit?: string) {
    return { payments: await listFinancePayments(Number(limit) || 50) };
  }

  @Get('subscriptions')
  async subscriptions() {
    return { subscriptions: await listFinanceSubscriptions() };
  }

  @Post('refunds')
  async refund(@Body() body: { paymentId?: string }, @Req() req: AuthRequest) {
    const paymentId = body?.paymentId?.trim();
    if (!paymentId) throw new HttpException('paymentId requerido', HttpStatus.BAD_REQUEST);
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const result = await requestFinanceRefund(paymentId, req.auth!.userId, actorRole);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return result;
  }
}
