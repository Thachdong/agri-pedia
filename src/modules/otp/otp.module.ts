import { Module } from '@nestjs/common';
import { OTP_REPOSITORY } from './application/ports';
import { IssueOtpUseCase } from './application/use-cases';
import { UserIdentifierVerificationRequestedHandler } from './infrastructure/handlers/user-identifier-verification-requested.handler';
import { PgOtpRepository } from './infrastructure/persistence/pg-otp.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    IssueOtpUseCase,
    { provide: OTP_REPOSITORY, useClass: PgOtpRepository },
    UserIdentifierVerificationRequestedHandler,
  ],
  exports: [],
})
export class OtpModule {}
