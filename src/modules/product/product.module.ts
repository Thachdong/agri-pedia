import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import {
  CreateProductUseCase,
  ListCategoriesUseCase,
} from './application/use-cases';
import { CATEGORY_REPOSITORY, PRODUCT_REPOSITORY } from './application/ports';
import { PgCategoryRepository } from './infrastructure/persistence/pg-category.repository';
import { PgProductRepository } from './infrastructure/persistence/pg-product.repository';

@Module({
  imports: [UserModule],
  controllers: [],
  providers: [
    CreateProductUseCase,
    ListCategoriesUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PgProductRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PgCategoryRepository },
  ],
  exports: [],
})
export class ProductModule {}
