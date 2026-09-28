import { Province } from '../../domain';

export interface ILocationRepository {
  /** Every province, in master data order. */
  listProvinces(): Promise<Province[]>;
}

export const LOCATION_REPOSITORY = Symbol('LOCATION_REPOSITORY');
