import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyAuthToken } from '../../lib/jwt';

export interface AuthPayload {
  userId: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      auth?: AuthPayload;
    }>();

    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('No autorizado');
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    request.auth = payload;
    return true;
  }
}
