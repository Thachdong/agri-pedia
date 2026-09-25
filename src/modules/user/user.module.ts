import { Module } from '@nestjs/common';
import { ADDRESS_REPOSITORY, USER_REPOSITORY } from './application/ports';
import { RegisterUserUseCase } from './application/use-cases';
import './infrastructure/http/auth.api-docs';
import { AuthController } from './infrastructure/http/auth.controller';
import { PgAddressRepository } from './infrastructure/persistence/pg-address.repository';
import { PgUserRepository } from './infrastructure/persistence/pg-user.repository';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
    { provide: ADDRESS_REPOSITORY, useClass: PgAddressRepository },
  ],
  exports: [],
})
export class UserModule {}
