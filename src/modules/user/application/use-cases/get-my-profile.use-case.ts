import { Inject, Injectable } from '@nestjs/common';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import {
  EBusinessType,
  ELoginType,
  EUserRole,
  UserNotFoundException,
} from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';
import { readUserContactDetails } from '../user-contact-details';

export type TGetMyProfileInput = {
  /** Caller, from the access token. */
  userId: string;
};

export type TGetMyProfileOutput = {
  id: string;
  loginType: ELoginType;
  /** Decrypted identifier when loginType is EMAIL; otherwise null. */
  email: string | null;
  /** Decrypted identifier when loginType is PHONE; otherwise null. */
  phone: string | null;
  username: string;
  role: EUserRole;
  businessType: EBusinessType | null;
  /** Signed read URL; null if none. */
  businessLicense: string | null;
  /** Signed read URL; null if none (or its media is not recorded yet). */
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Primary address; null if the user has none. */
  address: {
    province: string;
    ward: string;
    houseNumber: string;
    lat: number;
    long: number;
  } | null;
};

/** Profile of the caller; no status check (a valid access token is enough). */
@Injectable()
export class GetMyProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ADDRESS_REPOSITORY)
    private readonly addresses: IAddressRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
  ) {}

  async execute(input: TGetMyProfileInput): Promise<TGetMyProfileOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }
    const [address, contact] = await Promise.all([
      this.addresses.findPrimaryByUserId(user.id),
      readUserContactDetails(user, this.crypto, this.mediaQuery),
    ]);

    return {
      id: user.id,
      loginType: user.loginType,
      email: contact.email,
      phone: contact.phone,
      username: user.username,
      role: user.role,
      businessType: user.businessType,
      businessLicense: contact.businessLicense,
      avatar: contact.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
