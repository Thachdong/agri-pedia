import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  EBusinessType,
  ELoginType,
  EUserRole,
  Identifier,
  InvalidCredentialsException,
  RefreshToken,
} from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TLoginUserInput = {
  loginType: ELoginType;
  identifier: string;
  password: string;
};

export type TLoginUserOutput = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    loginType: ELoginType;
    username: string;
    role: EUserRole;
    businessType: EBusinessType | null;
    businessLicense: string | null;
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
};

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ADDRESS_REPOSITORY)
    private readonly addresses: IAddressRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: IAccessTokenService,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  /**
   * Unknown identifier, login type mismatch and wrong password all throw
   * InvalidCredentials. Status is checked only after the password matched.
   */
  async execute(input: TLoginUserInput): Promise<TLoginUserOutput> {
    const identifier = Identifier.create(input.loginType, input.identifier);
    const hashedIdentifier = this.crypto.hash(identifier.value);

    const user = await this.users.findByHashedIdentifier(hashedIdentifier);
    if (
      !user ||
      user.loginType !== identifier.loginType ||
      !(await this.crypto.verifyPassword(input.password, user.passwordHash))
    ) {
      throw new InvalidCredentialsException();
    }
    user.assertCanLogin();

    const refreshToken = this.crypto.randomToken();
    await this.unitOfWork.runInTransaction(() =>
      this.refreshTokens.save(
        RefreshToken.issue({
          hashedToken: this.crypto.hash(refreshToken),
          hashedIdentifier,
          ttlSeconds: this.config.get('auth').refreshTokenTtlSeconds,
        }),
      ),
    );
    const accessToken = await this.accessTokens.sign({ userId: user.id });
    const address = await this.addresses.findPrimaryByUserId(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
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
      },
    };
  }
}
