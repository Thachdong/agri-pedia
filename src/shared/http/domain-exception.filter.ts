import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException, EDomainErrorType } from '../domain';

const STATUS_BY_TYPE: Record<EDomainErrorType, HttpStatus> = {
  [EDomainErrorType.VALIDATION]: HttpStatus.BAD_REQUEST,
  [EDomainErrorType.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [EDomainErrorType.CONFLICT]: HttpStatus.CONFLICT,
  [EDomainErrorType.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [EDomainErrorType.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [EDomainErrorType.BUSINESS_RULE]: HttpStatus.UNPROCESSABLE_ENTITY,
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const statusCode = STATUS_BY_TYPE[exception.type];
    host.switchToHttp().getResponse<Response>().status(statusCode).json({
      statusCode,
      code: exception.code,
      message: exception.message,
      details: exception.details,
    });
  }
}
