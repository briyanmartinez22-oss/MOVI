import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthPayload } from '../guards/jwt-auth.guard';

export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPayload => {
    const request = ctx.switchToHttp().getRequest<{ auth: AuthPayload }>();
    return request.auth;
  }
);
