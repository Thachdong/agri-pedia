import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { OTP_REPOSITORY } from './application/ports';
import {
  IssueOtpUseCase,
  RequestPasswordResetOtpUseCase,
  ResendActivationOtpUseCase,
  VerifyActivationOtpUseCase,
  VerifyPasswordResetOtpUseCase,
} from './application/use-cases';
import './infrastructure/http/activation.api-docs';
import './infrastructure/http/password-reset.api-docs';
import { ActivationController } from './infrastructure/http/activation.controller';
import { PasswordResetController } from './infrastructure/http/password-reset.controller';
import { UserIdentifierVerificationRequestedHandler } from './infrastructure/handlers/user-identifier-verification-requested.handler';
import { PgOtpRepository } from './infrastructure/persistence/pg-otp.repository';

@Module({
  imports: [UserModule],
  controllers: [ActivationController, PasswordResetController],
  providers: [
    IssueOtpUseCase,
    VerifyActivationOtpUseCase,
    ResendActivationOtpUseCase,
    RequestPasswordResetOtpUseCase,
    VerifyPasswordResetOtpUseCase,
    { provide: OTP_REPOSITORY, useClass: PgOtpRepository },
    UserIdentifierVerificationRequestedHandler,
  ],
  exports: [],
})
export class OtpModule {}
