import { Module } from '@nestjs/common';
import { ADDRESS_REPOSITORY, USER_REPOSITORY } from './application/ports';
import {
  ActivateUserUseCase,
  RegisterUserUseCase,
} from './application/use-cases';
import { USER_QUERY_PORT } from './contracts';
import './infrastructure/http/auth.api-docs';
import { OtpActivationCodeVerifiedHandler } from './infrastructure/handlers/otp-activation-code-verified.handler';
import { AuthController } from './infrastructure/http/auth.controller';
import { PgAddressRepository } from './infrastructure/persistence/pg-address.repository';
import { PgUserRepository } from './infrastructure/persistence/pg-user.repository';
import { UserQueryService } from './infrastructure/queries/user-query.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    ActivateUserUseCase,
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
    { provide: ADDRESS_REPOSITORY, useClass: PgAddressRepository },
    { provide: USER_QUERY_PORT, useClass: UserQueryService },
    OtpActivationCodeVerifiedHandler,
  ],
  exports: [USER_QUERY_PORT],
})
export class UserModule {}
