import { Module } from '@nestjs/common';
import {
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
import { PgKnowledgeRepository } from './infrastructure/persistence/pg-knowledge.repository';
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
    {
      provide: KNOWLEDGE_BASE_SOURCE,
      useFactory: () => new JsonKnowledgeBaseSource(),
    },
    { provide: KNOWLEDGE_QUERY_PORT, useClass: KnowledgeQueryService },
  ],
  exports: [KNOWLEDGE_QUERY_PORT],
})
export class KnowledgeModule {}
