import { Province, Ward } from '../../../domain';
import { ILocationRepository } from '../location.repository';

/** Keeps insertion order as master data order. */
export class InMemoryLocationRepository implements ILocationRepository {
  readonly provinces: Province[] = [];
  readonly wards: Ward[] = [];

  async listProvinces(): Promise<Province[]> {
    return [...this.provinces];
  }

  async provinceExists(provinceCode: string): Promise<boolean> {
    return this.provinces.some(
      (province) => province.codename === provinceCode,
    );
  }

  async listWardsByProvince(provinceCode: string): Promise<Ward[]> {
    return this.wards.filter((ward) => ward.provinceCodename === provinceCode);
  }

  async wardExists(provinceCode: string, wardCode: string): Promise<boolean> {
    return this.wards.some(
      (ward) =>
        ward.provinceCodename === provinceCode && ward.codename === wardCode,
    );
  }
}
