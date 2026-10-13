import { Module } from '@nestjs/common';
import {
  GetDiseaseDetailUseCase,
  ListCropsUseCase,
  ListDiseasesUseCase,
  SeedKnowledgeBaseUseCase,
} from './application/use-cases';

@Module({
  imports: [],
  controllers: [],
  providers: [
    SeedKnowledgeBaseUseCase,
    ListCropsUseCase,
    ListDiseasesUseCase,
    GetDiseaseDetailUseCase,
  ],
  exports: [],
})
export class KnowledgeModule {}
