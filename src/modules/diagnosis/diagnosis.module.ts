import { Module } from '@nestjs/common';
import { KnowledgeModule } from '@modules/knowledge/knowledge.module';
import { MediaModule } from '@modules/media/media.module';
import { UserModule } from '@modules/user/user.module';
import {
  CreateDiagnosisUseCase,
  FailStaleDiagnosesUseCase,
  GetDiagnosisUseCase,
  ListMyDiagnosesUseCase,
  ProcessDiagnosisUseCase,
  SubmitDiagnosisFeedbackUseCase,
} from './application/use-cases';
import { DIAGNOSIS_REPOSITORY } from './application/ports';
import { PgDiagnosisRepository } from './infrastructure/persistence/pg-diagnosis.repository';

@Module({
  imports: [UserModule, KnowledgeModule, MediaModule],
  controllers: [],
  providers: [
    CreateDiagnosisUseCase,
    ProcessDiagnosisUseCase,
    GetDiagnosisUseCase,
    ListMyDiagnosesUseCase,
    SubmitDiagnosisFeedbackUseCase,
    FailStaleDiagnosesUseCase,
    { provide: DIAGNOSIS_REPOSITORY, useClass: PgDiagnosisRepository },
  ],
  exports: [],
})
export class DiagnosisModule {}
