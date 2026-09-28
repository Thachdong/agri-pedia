import { Module } from '@nestjs/common';
import { LOCATION_REPOSITORY } from './application/ports';
import {
  ListProvincesUseCase,
  ListWardsByProvinceUseCase,
} from './application/use-cases';
import { PgLocationRepository } from './infrastructure/persistence/pg-location.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    ListProvincesUseCase,
    ListWardsByProvinceUseCase,
    { provide: LOCATION_REPOSITORY, useClass: PgLocationRepository },
  ],
  exports: [],
})
export class LocationModule {}
