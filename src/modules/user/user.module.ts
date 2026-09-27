import { Module } from '@nestjs/common';
import {
  ADDRESS_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from './application/ports';
import {
  ActivateUserUseCase,
  ChangePasswordUseCase,
  LoginUserUseCase,
  LogoutUserUseCase,
  RefreshAccessTokenUseCase,
  RegisterUserUseCase,
  ResetPasswordUseCase,
  UpdateProfileUseCase,
} from './application/use-cases';
import { USER_QUERY_PORT } from './contracts';
import './infrastructure/http/auth.api-docs';
import { OtpActivationCodeVerifiedHandler } from './infrastructure/handlers/otp-activation-code-verified.handler';
import { OtpPasswordResetCodeVerifiedHandler } from './infrastructure/handlers/otp-password-reset-code-verified.handler';
import { AuthController } from './infrastructure/http/auth.controller';
import { PgAddressRepository } from './infrastructure/persistence/pg-address.repository';
import { PgRefreshTokenRepository } from './infrastructure/persistence/pg-refresh-token.repository';
import { PgUserRepository } from './infrastructure/persistence/pg-user.repository';
import { UserQueryService } from './infrastructure/queries/user-query.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    ActivateUserUseCase,
    LoginUserUseCase,
    LogoutUserUseCase,
    RefreshAccessTokenUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
    { provide: ADDRESS_REPOSITORY, useClass: PgAddressRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PgRefreshTokenRepository },
    { provide: USER_QUERY_PORT, useClass: UserQueryService },
    OtpActivationCodeVerifiedHandler,
    OtpPasswordResetCodeVerifiedHandler,
  ],
  exports: [USER_QUERY_PORT],
})
export class UserModule {}
