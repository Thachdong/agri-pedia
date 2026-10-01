import { Module } from '@nestjs/common';
import { LocationModule } from '@modules/location/location.module';
import {
  ADDRESS_REPOSITORY,
  DISTRIBUTOR_SEARCH_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from './application/ports';
import {
  ActivateUserUseCase,
  ChangePasswordUseCase,
  CreateAddressUseCase,
  FindNearbyDistributorsUseCase,
  GetDistributorProfileUseCase,
  GetMyProfileUseCase,
  IssueRealtimeTicketUseCase,
  ListMyAddressesUseCase,
  LoginUserUseCase,
  LogoutUserUseCase,
  RefreshAccessTokenUseCase,
  RegisterUserUseCase,
  ResetPasswordUseCase,
  UpdateProfileUseCase,
} from './application/use-cases';
import { USER_QUERY_PORT } from './contracts';
import './infrastructure/http/auth.api-docs';
import './infrastructure/http/distributor.api-docs';
import './infrastructure/http/user.api-docs';
import { OtpActivationCodeVerifiedHandler } from './infrastructure/handlers/otp-activation-code-verified.handler';
import { OtpPasswordResetCodeVerifiedHandler } from './infrastructure/handlers/otp-password-reset-code-verified.handler';
import { AuthController } from './infrastructure/http/auth.controller';
import { DistributorController } from './infrastructure/http/distributor.controller';
import { UserController } from './infrastructure/http/user.controller';
import { PgAddressRepository } from './infrastructure/persistence/pg-address.repository';
import { PgDistributorSearchRepository } from './infrastructure/persistence/pg-distributor-search.repository';
import { PgRefreshTokenRepository } from './infrastructure/persistence/pg-refresh-token.repository';
import { PgUserRepository } from './infrastructure/persistence/pg-user.repository';
import { UserQueryService } from './infrastructure/queries/user-query.service';

@Module({
  imports: [LocationModule],
  controllers: [AuthController, UserController, DistributorController],
  providers: [
    RegisterUserUseCase,
    ActivateUserUseCase,
    LoginUserUseCase,
    LogoutUserUseCase,
    RefreshAccessTokenUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    FindNearbyDistributorsUseCase,
    GetMyProfileUseCase,
    GetDistributorProfileUseCase,
    ListMyAddressesUseCase,
    CreateAddressUseCase,
    IssueRealtimeTicketUseCase,
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
    { provide: ADDRESS_REPOSITORY, useClass: PgAddressRepository },
    {
      provide: DISTRIBUTOR_SEARCH_REPOSITORY,
      useClass: PgDistributorSearchRepository,
    },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PgRefreshTokenRepository },
    { provide: USER_QUERY_PORT, useClass: UserQueryService },
    OtpActivationCodeVerifiedHandler,
    OtpPasswordResetCodeVerifiedHandler,
  ],
  exports: [USER_QUERY_PORT],
})
export class UserModule {}
