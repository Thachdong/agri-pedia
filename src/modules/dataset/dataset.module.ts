import { Module } from '@nestjs/common';
import {
  IMAGE_QUALITY_INSPECTOR,
  TRAINING_SAMPLE_REPOSITORY,
} from './application/ports';
import { CollectTrainingSamplesUseCase } from './application/use-cases';
import { DiagnosisCaseCompletedHandler } from './infrastructure/handlers/diagnosis-case-completed.handler';
import { SharpImageQualityInspector } from './infrastructure/image/sharp-image-quality.inspector';
import { PgTrainingSampleRepository } from './infrastructure/persistence/pg-training-sample.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    CollectTrainingSamplesUseCase,
    DiagnosisCaseCompletedHandler,
    {
      provide: TRAINING_SAMPLE_REPOSITORY,
      useClass: PgTrainingSampleRepository,
    },
    { provide: IMAGE_QUALITY_INSPECTOR, useClass: SharpImageQualityInspector },
  ],
  exports: [],
})
export class DatasetModule {}
