import { Module } from '@nestjs/common';
import {
  ARTICLE_REPOSITORY,
  ARTICLE_SOURCE,
  KNOWLEDGE_BASE_SOURCE,
  KNOWLEDGE_REPOSITORY,
} from './application/ports';
import {
  GetArticleSitemapUseCase,
  GetArticleUseCase,
  GetDiseaseDetailUseCase,
  ListArticleCropsUseCase,
  ListArticlesUseCase,
  ListCropsUseCase,
  ListDiseasesUseCase,
  RevalidateArticlesUseCase,
  SeedArticlesUseCase,
  SeedKnowledgeBaseUseCase,
} from './application/use-cases';
import { KNOWLEDGE_QUERY_PORT } from './contracts';
import './infrastructure/http/knowledge.api-docs';
import { KnowledgeController } from './infrastructure/http/knowledge.controller';
import { KnowledgeQueryService } from './infrastructure/queries/knowledge-query.service';
import { PgArticleRepository } from './infrastructure/persistence/pg-article.repository';
import { PgKnowledgeRepository } from './infrastructure/persistence/pg-knowledge.repository';
import { FileArticleSource } from './infrastructure/seed/file-article.source';
import { JsonKnowledgeBaseSource } from './infrastructure/seed/json-knowledge-base.source';
import { KnowledgeSeeder } from './infrastructure/seed/knowledge.seeder';

@Module({
  imports: [],
  controllers: [KnowledgeController],
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
    KnowledgeSeeder,
    { provide: KNOWLEDGE_REPOSITORY, useClass: PgKnowledgeRepository },
    { provide: ARTICLE_REPOSITORY, useClass: PgArticleRepository },
    {
      provide: KNOWLEDGE_BASE_SOURCE,
      useFactory: () => new JsonKnowledgeBaseSource(),
    },
    { provide: ARTICLE_SOURCE, useFactory: () => new FileArticleSource() },
    { provide: KNOWLEDGE_QUERY_PORT, useClass: KnowledgeQueryService },
  ],
  exports: [KNOWLEDGE_QUERY_PORT],
})
export class KnowledgeModule {}
