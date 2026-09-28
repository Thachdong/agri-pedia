import { Module } from '@nestjs/common';
import { LOCATION_REPOSITORY } from './application/ports';
import {
  ListProvincesUseCase,
  ListWardsByProvinceUseCase,
} from './application/use-cases';
import { LocationController } from './infrastructure/http/location.controller';
import { PgLocationRepository } from './infrastructure/persistence/pg-location.repository';

@Module({
  imports: [],
  controllers: [LocationController],
  providers: [
    ListProvincesUseCase,
    ListWardsByProvinceUseCase,
    { provide: LOCATION_REPOSITORY, useClass: PgLocationRepository },
  ],
  exports: [],
})
export class LocationModule {}
