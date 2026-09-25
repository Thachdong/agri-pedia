import { Module } from '@nestjs/common';
import { OTP_REPOSITORY } from './application/ports';
import { IssueOtpUseCase } from './application/use-cases';
import { PgOtpRepository } from './infrastructure/persistence/pg-otp.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    IssueOtpUseCase,
    { provide: OTP_REPOSITORY, useClass: PgOtpRepository },
  ],
  exports: [],
})
export class OtpModule {}
