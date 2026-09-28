import { Module } from '@nestjs/common';
import {
  ListProvincesUseCase,
  ListWardsByProvinceUseCase,
} from './application/use-cases';

@Module({
  imports: [],
  controllers: [],
  providers: [ListProvincesUseCase, ListWardsByProvinceUseCase],
  exports: [],
})
export class LocationModule {}
