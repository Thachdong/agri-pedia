import { Module } from '@nestjs/common';
import { CollectTrainingSamplesUseCase } from './application/use-cases';

@Module({
  imports: [],
  controllers: [],
  providers: [CollectTrainingSamplesUseCase],
  exports: [],
})
export class DatasetModule {}
