import { Module } from '@nestjs/common';
import { MediaModule } from '@modules/media/media.module';
import { UserModule } from '@modules/user/user.module';
import {
  CreateCatalogItemUseCase,
  CreateProductUseCase,
  DeleteCatalogItemUseCase,
  DeleteProductUseCase,
  GetProductDetailUseCase,
  GetProductSuggestionAiModelUseCase,
  GetProductSuggestionSettingsUseCase,
  ListCatalogItemsUseCase,
  ListCategoriesUseCase,
  ListDistributorProductsUseCase,
  ListProductSuggestionMissesUseCase,
  SuggestProductUseCase,
  UpdateCatalogItemUseCase,
  UpdateProductSuggestionAiModelUseCase,
  UpdateProductSuggestionSettingsUseCase,
  UpdateProductUseCase,
} from './application/use-cases';
import {
  CATALOG_REPOSITORY,
  CATEGORY_REPOSITORY,
  PRODUCT_NAME_READER,
  PRODUCT_REPOSITORY,
  PRODUCT_SUGGESTION_MISS_REPOSITORY,
  PRODUCT_SUGGESTION_SETTINGS_REPOSITORY,
  PRODUCT_SUGGESTION_USAGE_REPOSITORY,
} from './application/ports';
import { PRODUCT_QUERY_PORT } from './contracts';
import './infrastructure/http/admin-product-catalog.api-docs';
import './infrastructure/http/admin-product-suggestion.api-docs';
import './infrastructure/http/category.api-docs';
import './infrastructure/http/product.api-docs';
import './infrastructure/http/product-suggestion.api-docs';
import { AdminProductCatalogController } from './infrastructure/http/admin-product-catalog.controller';
import { AdminProductSuggestionController } from './infrastructure/http/admin-product-suggestion.controller';
import { CategoryController } from './infrastructure/http/category.controller';
import { ProductController } from './infrastructure/http/product.controller';
import { ProductSuggestionController } from './infrastructure/http/product-suggestion.controller';
import { PgCatalogRepository } from './infrastructure/persistence/pg-catalog.repository';
import { PgCategoryRepository } from './infrastructure/persistence/pg-category.repository';
import { PgProductSuggestionMissRepository } from './infrastructure/persistence/pg-product-suggestion-miss.repository';
import { PgProductSuggestionSettingsRepository } from './infrastructure/persistence/pg-product-suggestion-settings.repository';
import { PgProductSuggestionUsageRepository } from './infrastructure/persistence/pg-product-suggestion-usage.repository';
import { PgProductRepository } from './infrastructure/persistence/pg-product.repository';
import { ProductQueryService } from './infrastructure/queries/product-query.service';
import { AiProductNameReader } from './infrastructure/vision/ai-product-name.reader';

@Module({
  imports: [UserModule, MediaModule],
  controllers: [
    ProductController,
    ProductSuggestionController,
    CategoryController,
    AdminProductCatalogController,
    AdminProductSuggestionController,
  ],
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
    GetProductSuggestionAiModelUseCase,
    UpdateProductSuggestionAiModelUseCase,
    UpdateProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PgProductRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PgCategoryRepository },
    { provide: CATALOG_REPOSITORY, useClass: PgCatalogRepository },
    { provide: PRODUCT_NAME_READER, useClass: AiProductNameReader },
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
