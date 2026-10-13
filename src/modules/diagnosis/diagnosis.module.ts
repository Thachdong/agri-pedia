import { Module } from '@nestjs/common';
import { KnowledgeModule } from '@modules/knowledge/knowledge.module';
import { UserModule } from '@modules/user/user.module';
import {
  CreateDiagnosisUseCase,
  ProcessDiagnosisUseCase,
} from './application/use-cases';

@Module({
  imports: [UserModule, KnowledgeModule],
  controllers: [],
  providers: [CreateDiagnosisUseCase, ProcessDiagnosisUseCase],
  exports: [],
})
export class DiagnosisModule {}
