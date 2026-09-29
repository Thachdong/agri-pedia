import { Address } from '../../domain';

export interface IAddressRepository {
  save(address: Address): Promise<void>;
  findPrimaryByUserId(userId: string): Promise<Address | null>;
}

export const ADDRESS_REPOSITORY = Symbol('ADDRESS_REPOSITORY');
