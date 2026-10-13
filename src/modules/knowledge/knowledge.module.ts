import { Module } from '@nestjs/common';
import {
  KNOWLEDGE_BASE_SOURCE,
  KNOWLEDGE_REPOSITORY,
} from './application/ports';
import {
  GetDiseaseDetailUseCase,
  ListCropsUseCase,
  ListDiseasesUseCase,
  SeedKnowledgeBaseUseCase,
} from './application/use-cases';
import { PgKnowledgeRepository } from './infrastructure/persistence/pg-knowledge.repository';
import { JsonKnowledgeBaseSource } from './infrastructure/seed/json-knowledge-base.source';
import { KnowledgeSeeder } from './infrastructure/seed/knowledge.seeder';

@Module({
  imports: [],
  controllers: [],
  providers: [
    SeedKnowledgeBaseUseCase,
    ListCropsUseCase,
    ListDiseasesUseCase,
    GetDiseaseDetailUseCase,
    KnowledgeSeeder,
    { provide: KNOWLEDGE_REPOSITORY, useClass: PgKnowledgeRepository },
    {
      provide: KNOWLEDGE_BASE_SOURCE,
      useFactory: () => new JsonKnowledgeBaseSource(),
    },
  ],
  exports: [],
})
export class KnowledgeModule {}
