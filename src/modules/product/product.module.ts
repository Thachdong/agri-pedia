import { Module } from '@nestjs/common';
import { MediaModule } from '@modules/media/media.module';
import { UserModule } from '@modules/user/user.module';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  ListCategoriesUseCase,
  ListDistributorProductsUseCase,
  UpdateProductUseCase,
} from './application/use-cases';
import { CATEGORY_REPOSITORY, PRODUCT_REPOSITORY } from './application/ports';
import { PRODUCT_QUERY_PORT } from './contracts';
import './infrastructure/http/category.api-docs';
import './infrastructure/http/product.api-docs';
import { CategoryController } from './infrastructure/http/category.controller';
import { ProductController } from './infrastructure/http/product.controller';
import { PgCategoryRepository } from './infrastructure/persistence/pg-category.repository';
import { PgProductRepository } from './infrastructure/persistence/pg-product.repository';
import { ProductQueryService } from './infrastructure/queries/product-query.service';

@Module({
  imports: [UserModule, MediaModule],
  controllers: [ProductController, CategoryController],
  providers: [
    CreateProductUseCase,
    DeleteProductUseCase,
    ListCategoriesUseCase,
    ListDistributorProductsUseCase,
    UpdateProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PgProductRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PgCategoryRepository },
    { provide: PRODUCT_QUERY_PORT, useClass: ProductQueryService },
  ],
  exports: [PRODUCT_QUERY_PORT],
})
export class ProductModule {}
