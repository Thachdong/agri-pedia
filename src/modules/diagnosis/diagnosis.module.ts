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
  ],
  exports: [],
})
export class DiagnosisModule {}
