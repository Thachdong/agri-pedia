import { Module } from '@nestjs/common';
import { ListProvincesUseCase } from './application/use-cases';

@Module({
  imports: [],
  controllers: [],
  providers: [ListProvincesUseCase],
  exports: [],
})
export class LocationModule {}
