import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import {
  CreateProductUseCase,
  ListCategoriesUseCase,
} from './application/use-cases';

@Module({
  imports: [UserModule],
  controllers: [],
  providers: [CreateProductUseCase, ListCategoriesUseCase],
  exports: [],
})
export class ProductModule {}
