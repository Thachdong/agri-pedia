import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import {
  ARTICLE_CACHE_INVALIDATOR,
  ARTICLE_IMAGE_PUBLISHER,
  ARTICLE_REPOSITORY,
  ARTICLE_SOURCE,
  CROP_TOP_ARTICLES_REPOSITORY,
  KNOWLEDGE_BASE_SOURCE,
  KNOWLEDGE_REPOSITORY,
  TOP_ARTICLE_SETTINGS_REPOSITORY,
} from './application/ports';
import {
  CreateArticleUseCase,
  GetAdminArticleUseCase,
  GetArticleSitemapUseCase,
  GetArticleUseCase,
  GetCropTopArticlesUseCase,
  GetDiseaseDetailUseCase,
  GetTopArticleSettingsUseCase,
  ListAdminArticleCropsUseCase,
  ListAdminArticleTargetsUseCase,
  ListArticleCropsUseCase,
  ListArticlesUseCase,
  ListCropsUseCase,
  ListTopArticlesUseCase,
  PublishArticleUseCase,
  ListDiseasesUseCase,
  RevalidateArticlesUseCase,
  SeedArticlesUseCase,
  SeedKnowledgeBaseUseCase,
  SetCropTopArticlesUseCase,
  UnpublishArticleUseCase,
  UpdateArticleUseCase,
  UpdateTopArticleSettingsUseCase,
} from './application/use-cases';
import { KNOWLEDGE_QUERY_PORT } from './contracts';
import { AdminArticleController } from './infrastructure/http/admin-article.controller';
import { AdminTopArticleController } from './infrastructure/http/admin-top-article.controller';
import { ArticleController } from './infrastructure/http/article.controller';
import './infrastructure/http/admin-article.api-docs';
import './infrastructure/http/admin-top-article.api-docs';
import './infrastructure/http/article.api-docs';
import './infrastructure/http/knowledge.api-docs';
import { KnowledgeController } from './infrastructure/http/knowledge.controller';
import { SharpArticleImagePublisher } from './infrastructure/images/sharp-article-image.publisher';
import { KnowledgeQueryService } from './infrastructure/queries/knowledge-query.service';
import { NextArticleCacheInvalidator } from './infrastructure/revalidate/next-article-cache-invalidator';
import { PgArticleRepository } from './infrastructure/persistence/pg-article.repository';
import { PgCropTopArticlesRepository } from './infrastructure/persistence/pg-crop-top-articles.repository';
import { PgKnowledgeRepository } from './infrastructure/persistence/pg-knowledge.repository';
import { PgTopArticleSettingsRepository } from './infrastructure/persistence/pg-top-article-settings.repository';
import { FileArticleSource } from './infrastructure/seed/file-article.source';
import { JsonKnowledgeBaseSource } from './infrastructure/seed/json-knowledge-base.source';
import { KnowledgeSeeder } from './infrastructure/seed/knowledge.seeder';

@Module({
  imports: [UserModule],
  controllers: [
    KnowledgeController,
    ArticleController,
    AdminArticleController,
    AdminTopArticleController,
  ],
  providers: [
    SeedKnowledgeBaseUseCase,
    SeedArticlesUseCase,
    RevalidateArticlesUseCase,
    ListCropsUseCase,
    ListDiseasesUseCase,
    GetDiseaseDetailUseCase,
    ListArticleCropsUseCase,
    ListArticlesUseCase,
    GetArticleUseCase,
    GetCropTopArticlesUseCase,
    GetArticleSitemapUseCase,
    ListAdminArticleCropsUseCase,
    ListAdminArticleTargetsUseCase,
    GetAdminArticleUseCase,
    CreateArticleUseCase,
    UpdateArticleUseCase,
    UnpublishArticleUseCase,
    PublishArticleUseCase,
    GetTopArticleSettingsUseCase,
    UpdateTopArticleSettingsUseCase,
    GetCropTopArticlesUseCase,
    SetCropTopArticlesUseCase,
    ListTopArticlesUseCase,
    KnowledgeSeeder,
    { provide: KNOWLEDGE_REPOSITORY, useClass: PgKnowledgeRepository },
    { provide: ARTICLE_REPOSITORY, useClass: PgArticleRepository },
    {
      provide: TOP_ARTICLE_SETTINGS_REPOSITORY,
      useClass: PgTopArticleSettingsRepository,
    },
    {
      provide: CROP_TOP_ARTICLES_REPOSITORY,
      useClass: PgCropTopArticlesRepository,
    },
    {
      provide: KNOWLEDGE_BASE_SOURCE,
      useFactory: () => new JsonKnowledgeBaseSource(),
    },
    {
      provide: ARTICLE_CACHE_INVALIDATOR,
      useClass: NextArticleCacheInvalidator,
    },
    { provide: ARTICLE_SOURCE, useFactory: () => new FileArticleSource() },
    { provide: ARTICLE_IMAGE_PUBLISHER, useClass: SharpArticleImagePublisher },
    { provide: KNOWLEDGE_QUERY_PORT, useClass: KnowledgeQueryService },
  ],
  exports: [KNOWLEDGE_QUERY_PORT],
})
export class KnowledgeModule {}
