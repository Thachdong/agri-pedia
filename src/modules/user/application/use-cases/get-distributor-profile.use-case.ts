import { Inject, Injectable } from '@nestjs/common';
import {
  DistributorNotFoundException,
  EBusinessType,
  EUserRole,
  EUserStatus,
} from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TGetDistributorProfileInput = {
  distributorId: string;
};

export type TGetDistributorProfileOutput = {
  id: string;
  username: string;
  /** Media id. */
  avatar: string | null;
  bio: string | null;
  businessType: EBusinessType | null;
  createdAt: Date;
  /** Primary address; null if the distributor has none. */
  address: {
    province: string;
    ward: string;
    houseNumber: string;
    lat: number;
    long: number;
  } | null;
};

/** Public profile of an ACTIVE distributor with its primary address. */
@Injectable()
export class GetDistributorProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ADDRESS_REPOSITORY)
    private readonly addresses: IAddressRepository,
  ) {}

  async execute(
    input: TGetDistributorProfileInput,
  ): Promise<TGetDistributorProfileOutput> {
    const user = await this.users.findById(input.distributorId);
    if (
      !user ||
      user.role !== EUserRole.DISTRIBUTOR ||
      user.status !== EUserStatus.ACTIVE
    ) {
      throw new DistributorNotFoundException(input.distributorId);
    }
    const address = await this.addresses.findPrimaryByUserId(user.id);

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      businessType: user.businessType,
      createdAt: user.createdAt,
      address: address && {
        province: address.province,
        ward: address.ward,
        houseNumber: address.houseNumber,
        lat: address.coordinates.lat,
        long: address.coordinates.long,
      },
    };
  }
}
