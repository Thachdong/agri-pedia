import { Module } from '@nestjs/common';
import { LOCATION_REPOSITORY } from './application/ports';
import {
  ListProvincesUseCase,
  ListWardsByProvinceUseCase,
} from './application/use-cases';
import { LOCATION_QUERY_PORT } from './contracts';
import './infrastructure/http/location.api-docs';
import { LocationController } from './infrastructure/http/location.controller';
import { PgLocationRepository } from './infrastructure/persistence/pg-location.repository';
import { LocationQueryService } from './infrastructure/queries/location-query.service';

@Module({
  imports: [],
  controllers: [LocationController],
  providers: [
    ListProvincesUseCase,
    ListWardsByProvinceUseCase,
    { provide: LOCATION_REPOSITORY, useClass: PgLocationRepository },
    { provide: LOCATION_QUERY_PORT, useClass: LocationQueryService },
  ],
  exports: [LOCATION_QUERY_PORT],
})
export class LocationModule {}
