import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { CreateProductUseCase } from './application/use-cases';

@Module({
  imports: [UserModule],
  controllers: [],
  providers: [CreateProductUseCase],
  exports: [],
})
export class ProductModule {}
