import { Inject, Injectable } from '@nestjs/common';
import { LocationProvinceNotFoundException } from '../../domain';
import {
  ILocationRepository,
  LOCATION_REPOSITORY,
} from '../ports/location.repository';
import { TLocationItem } from './list-provinces.use-case';

export type TListWardsByProvinceInput = { provinceCode: string };
export type TListWardsByProvinceOutput = { wards: TLocationItem[] };

/** Wards of one province, in master data order (public). */
@Injectable()
export class ListWardsByProvinceUseCase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locations: ILocationRepository,
  ) {}

  async execute(
    input: TListWardsByProvinceInput,
  ): Promise<TListWardsByProvinceOutput> {
    if (!(await this.locations.provinceExists(input.provinceCode))) {
      throw new LocationProvinceNotFoundException(input.provinceCode);
    }
    const wards = await this.locations.listWardsByProvince(input.provinceCode);
    return {
      wards: wards.map((ward) => ({
        codename: ward.codename,
        name: ward.name,
      })),
    };
  }
}
