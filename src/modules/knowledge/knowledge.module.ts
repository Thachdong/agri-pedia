import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import {
  ARTICLE_CACHE_INVALIDATOR,
  ARTICLE_IMAGE_PUBLISHER,
  ARTICLE_REPOSITORY,
  ARTICLE_SOURCE,
  KNOWLEDGE_BASE_SOURCE,
  KNOWLEDGE_REPOSITORY,
} from './application/ports';
import {
  CreateArticleUseCase,
  GetAdminArticleUseCase,
  GetArticleSitemapUseCase,
  GetArticleUseCase,
  GetDiseaseDetailUseCase,
  ListAdminArticleCropsUseCase,
  ListAdminArticleTargetsUseCase,
  ListArticleCropsUseCase,
  ListArticlesUseCase,
  ListCropsUseCase,
  PublishArticleUseCase,
  ListDiseasesUseCase,
  RevalidateArticlesUseCase,
  SeedArticlesUseCase,
  SeedKnowledgeBaseUseCase,
  UnpublishArticleUseCase,
  UpdateArticleUseCase,
} from './application/use-cases';
import { KNOWLEDGE_QUERY_PORT } from './contracts';
import { AdminArticleController } from './infrastructure/http/admin-article.controller';
import { ArticleController } from './infrastructure/http/article.controller';
import './infrastructure/http/admin-article.api-docs';
import './infrastructure/http/article.api-docs';
import './infrastructure/http/knowledge.api-docs';
import { KnowledgeController } from './infrastructure/http/knowledge.controller';
import { SharpArticleImagePublisher } from './infrastructure/images/sharp-article-image.publisher';
import { KnowledgeQueryService } from './infrastructure/queries/knowledge-query.service';
import { NextArticleCacheInvalidator } from './infrastructure/revalidate/next-article-cache-invalidator';
import { PgArticleRepository } from './infrastructure/persistence/pg-article.repository';
import { PgKnowledgeRepository } from './infrastructure/persistence/pg-knowledge.repository';
import { FileArticleSource } from './infrastructure/seed/file-article.source';
import { JsonKnowledgeBaseSource } from './infrastructure/seed/json-knowledge-base.source';
import { KnowledgeSeeder } from './infrastructure/seed/knowledge.seeder';

@Module({
  imports: [UserModule],
  controllers: [KnowledgeController, ArticleController, AdminArticleController],
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
    GetArticleSitemapUseCase,
    ListAdminArticleCropsUseCase,
    ListAdminArticleTargetsUseCase,
    GetAdminArticleUseCase,
    CreateArticleUseCase,
    UpdateArticleUseCase,
    UnpublishArticleUseCase,
    PublishArticleUseCase,
    KnowledgeSeeder,
    { provide: KNOWLEDGE_REPOSITORY, useClass: PgKnowledgeRepository },
    { provide: ARTICLE_REPOSITORY, useClass: PgArticleRepository },
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
