import { Province } from '../../../domain';
import { ILocationRepository } from '../location.repository';

/** Keeps insertion order as master data order. */
export class InMemoryLocationRepository implements ILocationRepository {
  readonly provinces: Province[] = [];

  async listProvinces(): Promise<Province[]> {
    return [...this.provinces];
  }
}
