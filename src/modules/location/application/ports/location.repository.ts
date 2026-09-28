import { Province, Ward } from '../../domain';

export interface ILocationRepository {
  /** Every province, in master data order. */
  listProvinces(): Promise<Province[]>;
  provinceExists(provinceCode: string): Promise<boolean>;
  /** Wards of the province, in master data order; empty for an unknown province. */
  listWardsByProvince(provinceCode: string): Promise<Ward[]>;
}

export const LOCATION_REPOSITORY = Symbol('LOCATION_REPOSITORY');
