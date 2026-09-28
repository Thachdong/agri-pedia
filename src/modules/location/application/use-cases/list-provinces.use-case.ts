import { Inject, Injectable } from '@nestjs/common';
import {
  ILocationRepository,
  LOCATION_REPOSITORY,
} from '../ports/location.repository';

export type TLocationItem = { codename: string; name: string };
export type TListProvincesOutput = { provinces: TLocationItem[] };

/** All provinces, in master data order (public). */
@Injectable()
export class ListProvincesUseCase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locations: ILocationRepository,
  ) {}

  async execute(): Promise<TListProvincesOutput> {
    const provinces = await this.locations.listProvinces();
    return {
      provinces: provinces.map((province) => ({
        codename: province.codename,
        name: province.name,
      })),
    };
  }
}
