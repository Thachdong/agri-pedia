import { Address } from '../../domain';

export interface IAddressRepository {
  save(address: Address): Promise<void>;
  findById(id: string): Promise<Address | null>;
  findPrimaryByUserId(userId: string): Promise<Address | null>;
  /** All addresses of a user: primary first, then by id. */
  findAllByUserId(userId: string): Promise<Address[]>;
}

export const ADDRESS_REPOSITORY = Symbol('ADDRESS_REPOSITORY');
