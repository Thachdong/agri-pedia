import { Module } from '@nestjs/common';
import { MediaModule } from '@modules/media/media.module';
import { UserModule } from '@modules/user/user.module';
import {
  CreateCatalogItemUseCase,
  CreateProductUseCase,
  DeleteCatalogItemUseCase,
  DeleteProductUseCase,
  GetProductDetailUseCase,
  GetProductSuggestionSettingsUseCase,
  ListCatalogItemsUseCase,
  ListCategoriesUseCase,
  ListDistributorProductsUseCase,
  ListProductSuggestionMissesUseCase,
  SuggestProductUseCase,
  UpdateCatalogItemUseCase,
  UpdateProductSuggestionSettingsUseCase,
  UpdateProductUseCase,
} from './application/use-cases';
import {
  CATALOG_REPOSITORY,
  CATEGORY_REPOSITORY,
  PRODUCT_REPOSITORY,
  PRODUCT_SUGGESTION_MISS_REPOSITORY,
  PRODUCT_SUGGESTION_SETTINGS_REPOSITORY,
  PRODUCT_SUGGESTION_USAGE_REPOSITORY,
} from './application/ports';
import { PRODUCT_QUERY_PORT } from './contracts';
import './infrastructure/http/category.api-docs';
import './infrastructure/http/product.api-docs';
import { CategoryController } from './infrastructure/http/category.controller';
import { ProductController } from './infrastructure/http/product.controller';
import { PgCatalogRepository } from './infrastructure/persistence/pg-catalog.repository';
import { PgCategoryRepository } from './infrastructure/persistence/pg-category.repository';
import { PgProductSuggestionMissRepository } from './infrastructure/persistence/pg-product-suggestion-miss.repository';
import { PgProductSuggestionSettingsRepository } from './infrastructure/persistence/pg-product-suggestion-settings.repository';
import { PgProductSuggestionUsageRepository } from './infrastructure/persistence/pg-product-suggestion-usage.repository';
import { PgProductRepository } from './infrastructure/persistence/pg-product.repository';
import { ProductQueryService } from './infrastructure/queries/product-query.service';

@Module({
  imports: [UserModule, MediaModule],
  controllers: [ProductController, CategoryController],
  providers: [
    CreateCatalogItemUseCase,
    CreateProductUseCase,
    DeleteCatalogItemUseCase,
    DeleteProductUseCase,
    GetProductDetailUseCase,
    GetProductSuggestionSettingsUseCase,
    ListCatalogItemsUseCase,
    ListCategoriesUseCase,
    ListDistributorProductsUseCase,
    ListProductSuggestionMissesUseCase,
    SuggestProductUseCase,
    UpdateCatalogItemUseCase,
    UpdateProductSuggestionSettingsUseCase,
    UpdateProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PgProductRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PgCategoryRepository },
    { provide: CATALOG_REPOSITORY, useClass: PgCatalogRepository },
    {
      provide: PRODUCT_SUGGESTION_SETTINGS_REPOSITORY,
      useClass: PgProductSuggestionSettingsRepository,
    },
    {
      provide: PRODUCT_SUGGESTION_USAGE_REPOSITORY,
      useClass: PgProductSuggestionUsageRepository,
    },
    {
      provide: PRODUCT_SUGGESTION_MISS_REPOSITORY,
      useClass: PgProductSuggestionMissRepository,
    },
    { provide: PRODUCT_QUERY_PORT, useClass: ProductQueryService },
  ],
  exports: [PRODUCT_QUERY_PORT],
})
export class ProductModule {}
