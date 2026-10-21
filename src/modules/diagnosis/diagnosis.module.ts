import { Module } from '@nestjs/common';
import { KnowledgeModule } from '@modules/knowledge/knowledge.module';
import { MediaModule } from '@modules/media/media.module';
import { UserModule } from '@modules/user/user.module';
import {
  CreateDiagnosisUseCase,
  DiagnosisReportBuilder,
  FailStaleDiagnosesUseCase,
  GetDiagnosisAiModelsUseCase,
  GetDiagnosisFormSettingsUseCase,
  GetDiagnosisSettingsUseCase,
  GetDiagnosisUseCase,
  ListMyDiagnosesUseCase,
  ProcessDiagnosisUseCase,
  SubmitDiagnosisFeedbackUseCase,
  UpdateDiagnosisAiModelsUseCase,
  UpdateDiagnosisSettingsUseCase,
} from './application/use-cases';
import {
  DIAGNOSIS_JOB_RUNNER,
  DIAGNOSIS_REPOSITORY,
  DIAGNOSIS_SETTINGS_REPOSITORY,
  IMAGE_PROCESSOR,
  VISION_DIAGNOSIS_PROVIDER,
} from './application/ports';
import { DIAGNOSIS_QUERY_PORT } from './contracts';
import './infrastructure/http/admin-diagnosis-settings.api-docs';
import './infrastructure/http/diagnosis.api-docs';
import { AdminDiagnosisSettingsController } from './infrastructure/http/admin-diagnosis-settings.controller';
import { DiagnosisController } from './infrastructure/http/diagnosis.controller';
import { SharpImageProcessor } from './infrastructure/image/sharp-image.processor';
import { DiagnosisStartup } from './infrastructure/jobs/diagnosis-startup';
import { InProcessDiagnosisJobRunner } from './infrastructure/jobs/in-process-diagnosis-job.runner';
import { DiagnosisQueryService } from './infrastructure/queries/diagnosis-query.service';
import { AiVisionProvider } from './infrastructure/vision/ai-vision.provider';
import { PgDiagnosisRepository } from './infrastructure/persistence/pg-diagnosis.repository';
import { PgDiagnosisSettingsRepository } from './infrastructure/persistence/pg-diagnosis-settings.repository';

@Module({
  imports: [UserModule, KnowledgeModule, MediaModule],
  controllers: [DiagnosisController, AdminDiagnosisSettingsController],
  providers: [
    CreateDiagnosisUseCase,
    ProcessDiagnosisUseCase,
    GetDiagnosisFormSettingsUseCase,
    GetDiagnosisSettingsUseCase,
    GetDiagnosisUseCase,
    ListMyDiagnosesUseCase,
    SubmitDiagnosisFeedbackUseCase,
    FailStaleDiagnosesUseCase,
    GetDiagnosisSettingsUseCase,
    UpdateDiagnosisSettingsUseCase,
    GetDiagnosisAiModelsUseCase,
    UpdateDiagnosisAiModelsUseCase,
    GetDiagnosisFormSettingsUseCase,
    DiagnosisReportBuilder,
    DiagnosisStartup,
    { provide: DIAGNOSIS_REPOSITORY, useClass: PgDiagnosisRepository },
    {
      provide: DIAGNOSIS_SETTINGS_REPOSITORY,
      useClass: PgDiagnosisSettingsRepository,
    },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessor },
    { provide: VISION_DIAGNOSIS_PROVIDER, useClass: AiVisionProvider },
    { provide: DIAGNOSIS_JOB_RUNNER, useClass: InProcessDiagnosisJobRunner },
    { provide: DIAGNOSIS_QUERY_PORT, useClass: DiagnosisQueryService },
  ],
  exports: [DIAGNOSIS_QUERY_PORT],
})
export class DiagnosisModule {}
