import { Inject, Injectable } from '@nestjs/common';
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

export type TGetMyProfileInput = {
  /** Caller, from the access token. */
  userId: string;
};

export type TGetMyProfileOutput = {
  id: string;
  loginType: ELoginType;
  username: string;
  role: EUserRole;
  businessType: EBusinessType | null;
  /** Media id. */
  businessLicense: string | null;
  /** Media id. */
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
  ) {}

  async execute(input: TGetMyProfileInput): Promise<TGetMyProfileOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }
    const address = await this.addresses.findPrimaryByUserId(user.id);

    return {
      id: user.id,
      loginType: user.loginType,
      username: user.username,
      role: user.role,
      businessType: user.businessType,
      businessLicense: user.businessLicense,
      avatar: user.avatar,
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
