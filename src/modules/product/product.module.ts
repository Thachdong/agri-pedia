import { Module } from '@nestjs/common';
import { MediaModule } from '@modules/media/media.module';
import { UserModule } from '@modules/user/user.module';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  ListCategoriesUseCase,
  UpdateProductUseCase,
} from './application/use-cases';
import { CATEGORY_REPOSITORY, PRODUCT_REPOSITORY } from './application/ports';
import './infrastructure/http/category.api-docs';
import './infrastructure/http/product.api-docs';
import { CategoryController } from './infrastructure/http/category.controller';
import { ProductController } from './infrastructure/http/product.controller';
import { PgCategoryRepository } from './infrastructure/persistence/pg-category.repository';
import { PgProductRepository } from './infrastructure/persistence/pg-product.repository';

@Module({
  imports: [UserModule, MediaModule],
  controllers: [ProductController, CategoryController],
  providers: [
    CreateProductUseCase,
    DeleteProductUseCase,
    ListCategoriesUseCase,
    UpdateProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PgProductRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PgCategoryRepository },
  ],
  exports: [],
})
export class ProductModule {}
