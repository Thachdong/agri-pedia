import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { OTP_REPOSITORY } from './application/ports';
import {
  IssueOtpUseCase,
  RequestPasswordResetOtpUseCase,
  ResendActivationOtpUseCase,
  VerifyActivationOtpUseCase,
} from './application/use-cases';
import './infrastructure/http/activation.api-docs';
import { ActivationController } from './infrastructure/http/activation.controller';
import { UserIdentifierVerificationRequestedHandler } from './infrastructure/handlers/user-identifier-verification-requested.handler';
import { PgOtpRepository } from './infrastructure/persistence/pg-otp.repository';

@Module({
  imports: [UserModule],
  controllers: [ActivationController],
  providers: [
    IssueOtpUseCase,
    VerifyActivationOtpUseCase,
    ResendActivationOtpUseCase,
    RequestPasswordResetOtpUseCase,
    { provide: OTP_REPOSITORY, useClass: PgOtpRepository },
    UserIdentifierVerificationRequestedHandler,
  ],
  exports: [],
})
export class OtpModule {}
