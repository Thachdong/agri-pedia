import { Address } from '../../domain';

export interface IAddressRepository {
  save(address: Address): Promise<void>;
}

export const ADDRESS_REPOSITORY = Symbol('ADDRESS_REPOSITORY');
