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
import {
  DIAGNOSIS_JOB_RUNNER,
  DIAGNOSIS_REPOSITORY,
  IMAGE_PROCESSOR,
  VISION_DIAGNOSIS_PROVIDER,
} from './application/ports';
import { SharpImageProcessor } from './infrastructure/image/sharp-image.processor';
import { DiagnosisStartup } from './infrastructure/jobs/diagnosis-startup';
import { InProcessDiagnosisJobRunner } from './infrastructure/jobs/in-process-diagnosis-job.runner';
import { AiVisionProvider } from './infrastructure/vision/ai-vision.provider';
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
    DiagnosisStartup,
    { provide: DIAGNOSIS_REPOSITORY, useClass: PgDiagnosisRepository },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessor },
    { provide: VISION_DIAGNOSIS_PROVIDER, useClass: AiVisionProvider },
    { provide: DIAGNOSIS_JOB_RUNNER, useClass: InProcessDiagnosisJobRunner },
  ],
  exports: [],
})
export class DiagnosisModule {}
