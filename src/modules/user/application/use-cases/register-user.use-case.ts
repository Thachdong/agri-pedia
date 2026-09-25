import { Inject, Injectable } from '@nestjs/common';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  Address,
  Coordinates,
  EBusinessType,
  ELoginType,
  EUserRole,
  Identifier,
  User,
  UserIdentifierAlreadyUsedException,
} from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TRegisterUserInput = {
  loginType: ELoginType;
  identifier: string;
  password: string;
  /** Defaults to the normalized identifier. */
  username?: string | null;
  role: EUserRole;
  businessType?: EBusinessType | null;
  bio?: string | null;
  /** First address; always stored as primary. */
  address: {
    province: string;
    ward: string;
    houseNumber: string;
    lat: number;
    long: number;
  };
};

export type TRegisterUserOutput = { userId: string };

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ADDRESS_REPOSITORY) private readonly addresses: IAddressRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TRegisterUserInput): Promise<TRegisterUserOutput> {
    const identifier = Identifier.create(input.loginType, input.identifier);
    const coordinates = Coordinates.create(
      input.address.lat,
      input.address.long,
    );
    const hashedIdentifier = this.crypto.hash(identifier.value);
    const passwordHash = await this.crypto.hashPassword(input.password);

    const user = await this.unitOfWork.runInTransaction(async () => {
      if (await this.users.existsByHashedIdentifier(hashedIdentifier)) {
        throw new UserIdentifierAlreadyUsedException();
      }
      const created = User.register({
        loginType: identifier.loginType,
        hashedIdentifier,
        encryptedIdentifier: this.crypto.encrypt(identifier.value),
        passwordHash,
        username: input.username?.trim() || identifier.value,
        role: input.role,
        businessType: input.businessType ?? null,
        bio: input.bio,
      });
      await this.users.save(created);
      await this.addresses.save(
        Address.createPrimary({
          userId: created.id,
          province: input.address.province,
          ward: input.address.ward,
          houseNumber: input.address.houseNumber,
          coordinates,
        }),
      );
      return created;
    });

    return { userId: user.id };
  }
}
