import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Inject,
} from '@nestjs/common';
import { ILogger, LOGGER } from '@shared/logger';
import { DomainException } from '../domain';

export type TRealtimeErrorAck = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Answers a failed message through its ack callback (no ack → dropped):
 * DomainException → its code, ValidationPipe → REALTIME_VALIDATION_FAILED, anything else → REALTIME_INTERNAL_ERROR.
 */
@Catch()
export class RealtimeExceptionFilter implements ExceptionFilter {
  private readonly logger: ILogger;

  constructor(@Inject(LOGGER) logger: ILogger) {
    this.logger = logger.withContext(RealtimeExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ack: unknown = host.getArgByIndex(2);
    const body = this.toAck(exception);
    if (typeof ack === 'function') {
      (ack as (body: TRealtimeErrorAck) => void)(body);
    }
  }

  private toAck(exception: unknown): TRealtimeErrorAck {
    if (exception instanceof DomainException) {
      return {
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      };
    }
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();
      return {
        error: {
          code: 'REALTIME_VALIDATION_FAILED',
          message: 'Message validation failed',
          details:
            typeof response === 'object' && 'message' in response
              ? response.message
              : undefined,
        },
      };
    }
    this.logger.error('Unhandled realtime handler error', exception);
    return {
      error: { code: 'REALTIME_INTERNAL_ERROR', message: 'Internal error' },
    };
  }
}
