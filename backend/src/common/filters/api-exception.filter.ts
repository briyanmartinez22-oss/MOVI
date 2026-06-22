import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let error: string;
      let code: string | undefined;

      if (typeof body === 'string') {
        error = body;
      } else if (typeof body === 'object' && body !== null) {
        const payload = body as { message?: unknown; error?: unknown; code?: unknown };
        if (typeof payload.error === 'string') {
          error = payload.error;
        } else if (Array.isArray(payload.message)) {
          error = payload.message.join(', ');
        } else if (typeof payload.message === 'string') {
          error = payload.message;
        } else {
          error = exception.message;
        }
        if (typeof payload.code === 'string') {
          code = payload.code;
        }
      } else {
        error = exception.message;
      }

      response.status(status).json(code ? { ok: false, error, code } : { ok: false, error });
      return;
    }

    const message =
      exception instanceof Error ? exception.message : 'Error interno';
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      error: message,
    });
  }
}
