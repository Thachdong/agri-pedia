import { Inject, Injectable } from '@nestjs/common';
import {
  ILocationRepository,
  LOCATION_REPOSITORY,
} from '../../application/ports';
import { ILocationQueryPort } from '../../contracts';

@Injectable()
export class LocationQueryService implements ILocationQueryPort {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locations: ILocationRepository,
  ) {}

  async provinceExists(provinceCode: string): Promise<boolean> {
    return this.locations.provinceExists(provinceCode);
  }

  async wardBelongsToProvince(
    provinceCode: string,
    wardCode: string,
  ): Promise<boolean> {
    return this.locations.wardExists(provinceCode, wardCode);
  }
}
