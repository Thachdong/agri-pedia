import { Module } from '@nestjs/common';
import { RegisterUserUseCase } from './application/use-cases';

@Module({
  imports: [],
  controllers: [],
  providers: [RegisterUserUseCase],
  exports: [],
})
export class UserModule {}
