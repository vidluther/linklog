import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as object)
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
          };

    const logData = {
      method: request.method,
      path: request.url,
      statusCode: status,
      body: request.body as unknown,
      error: errorResponse,
    };

    if (status >= 500) {
      this.logger.error(
        logData,
        exception instanceof Error ? exception.stack : 'Unexpected error',
      );
    } else {
      this.logger.warn(logData, 'HTTP exception');
    }

    response.status(status).json(errorResponse);
  }
}
