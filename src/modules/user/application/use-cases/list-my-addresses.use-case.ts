import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundException } from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TListMyAddressesInput = {
  /** Caller, from the access token. */
  userId: string;
};

export type TListMyAddressesOutput = {
  /** Primary first, then by id. */
  addresses: {
    id: string;
    province: string;
    ward: string;
    houseNumber: string;
    lat: number;
    long: number;
    isPrimary: boolean;
  }[];
};

/** Every address of the caller; no status check (a valid access token is enough). */
@Injectable()
export class ListMyAddressesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ADDRESS_REPOSITORY)
    private readonly addresses: IAddressRepository,
  ) {}

  async execute(input: TListMyAddressesInput): Promise<TListMyAddressesOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }
    const addresses = await this.addresses.findAllByUserId(user.id);

    return {
      addresses: addresses.map((address) => ({
        id: address.id,
        province: address.province,
        ward: address.ward,
        houseNumber: address.houseNumber,
        lat: address.coordinates.lat,
        long: address.coordinates.long,
        isPrimary: address.isPrimary,
      })),
    };
  }
}
