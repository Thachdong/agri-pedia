import { Module } from '@nestjs/common';
import { OTP_REPOSITORY } from './application/ports';
import { IssueOtpUseCase } from './application/use-cases';
import { UserRegisteredHandler } from './infrastructure/handlers/user-registered.handler';
import { PgOtpRepository } from './infrastructure/persistence/pg-otp.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    IssueOtpUseCase,
    { provide: OTP_REPOSITORY, useClass: PgOtpRepository },
    UserRegisteredHandler,
  ],
  exports: [],
})
export class OtpModule {}
