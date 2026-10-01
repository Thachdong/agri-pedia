import { Inject, Injectable } from '@nestjs/common';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
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
import { readUserContactDetails } from '../user-contact-details';

export type TGetDistributorProfileInput = {
  distributorId: string;
};

export type TGetDistributorProfileOutput = {
  id: string;
  /** Decrypted identifier when the distributor logs in by email; otherwise null. */
  email: string | null;
  /** Decrypted identifier when the distributor logs in by phone; otherwise null. */
  phone: string | null;
  username: string;
  /** Media id. */
  avatar: string | null;
  bio: string | null;
  businessType: EBusinessType | null;
  /** Signed read URL; null if none. */
  businessLicense: string | null;
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
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
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
    const [address, contact] = await Promise.all([
      this.addresses.findPrimaryByUserId(user.id),
      readUserContactDetails(user, this.crypto, this.mediaQuery),
    ]);

    return {
      id: user.id,
      email: contact.email,
      phone: contact.phone,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      businessType: user.businessType,
      businessLicense: contact.businessLicense,
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
