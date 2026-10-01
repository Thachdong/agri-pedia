import { IMediaQueryPort } from '@modules/media/contracts';
import { InMemoryAccessTokenService } from '@shared/access-token';
import { IConfigService } from '@shared/config';
import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  Address,
  Coordinates,
  EBusinessType,
  ELoginType,
  ERefreshTokenStatus,
  EUserRole,
  InvalidCredentialsException,
  User,
  UserNotActiveException,
} from '../../domain';
import {
  InMemoryAddressRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import { LoginUserUseCase, TLoginUserInput } from './login-user.use-case';

const config = {
  get: () => ({ refreshTokenTtlSeconds: 3600 }),
} as unknown as IConfigService;

const mediaQuery: IMediaQueryPort = {
  findThumbnails: async () => [],
  findUrls: async (_, __, mediaIds) =>
    mediaIds.map((mediaId) => ({ mediaId, url: `https://signed/${mediaId}` })),
};

const input: TLoginUserInput = {
  loginType: ELoginType.EMAIL,
  identifier: ' Farmer@Mail.com ',
  password: 'secret123',
};

describe('LoginUserUseCase', () => {
  let users: InMemoryUserRepository;
  let addresses: InMemoryAddressRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let crypto: InMemoryCryptoService;
  let accessTokens: InMemoryAccessTokenService;
  let useCase: LoginUserUseCase;

  const register = (
    overrides: Partial<Parameters<typeof User.register>[0]>,
  ) => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: 'hash(farmer@mail.com)',
      encryptedIdentifier: 'enc(farmer@mail.com)',
      passwordHash: 'pwd(secret123)',
      username: 'farmer01',
      role: EUserRole.FARMER,
      businessType: null,
      ...overrides,
    });
    users.items.set(user.id, user);
    return user;
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    addresses = new InMemoryAddressRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    crypto = new InMemoryCryptoService();
    crypto.nextToken = 'raw-refresh';
    accessTokens = new InMemoryAccessTokenService();
    useCase = new LoginUserUseCase(
      users,
      addresses,
      refreshTokens,
      crypto,
      accessTokens,
      config,
      new InMemoryUnitOfWork(),
      mediaQuery,
    );
  });

  it('issues tokens and returns the profile of an active user', async () => {
    const user = register({});
    await addresses.save(
      Address.createPrimary({
        userId: user.id,
        province: 'ha_noi',
        ward: 'phuong_ba_dinh',
        houseNumber: '12 Kim Ma',
        coordinates: Coordinates.create(21.03, 105.82),
      }),
    );

    const output = await useCase.execute(input);

    expect(output.accessToken).toBe(`access(${user.id})`);
    expect(accessTokens.signed).toEqual([{ userId: user.id }]);
    expect(output.refreshToken).toBe('raw-refresh');
    expect(output.user).toEqual({
      id: user.id,
      loginType: ELoginType.EMAIL,
      email: 'farmer@mail.com',
      phone: null,
      username: 'farmer01',
      role: EUserRole.FARMER,
      businessType: null,
      businessLicense: null,
      avatar: null,
      bio: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      address: {
        province: 'ha_noi',
        ward: 'phuong_ba_dinh',
        houseNumber: '12 Kim Ma',
        lat: 21.03,
        long: 105.82,
      },
    });
  });

  it('returns a null address when the user has no primary address', async () => {
    register({});

    const output = await useCase.execute(input);

    expect(output.user.address).toBeNull();
  });

  it('returns the phone and business license URL of a phone account', async () => {
    const user = register({
      loginType: ELoginType.PHONE,
      hashedIdentifier: 'hash(0912345678)',
      encryptedIdentifier: 'enc(0912345678)',
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });
    user.activate();
    user.updateProfile({ businessLicense: 'license-1' });

    const output = await useCase.execute({
      loginType: ELoginType.PHONE,
      identifier: '0912 345 678',
      password: 'secret123',
    });

    expect(output.user).toMatchObject({
      email: null,
      phone: '0912345678',
      businessLicense: 'https://signed/license-1',
    });
  });

  it('stores only the hash of the refresh token', async () => {
    register({});

    await useCase.execute(input);

    const [stored] = [...refreshTokens.items.values()];
    expect(refreshTokens.items.size).toBe(1);
    expect(stored.hashedToken).toBe('hash(raw-refresh)');
    expect(stored.hashedIdentifier).toBe('hash(farmer@mail.com)');
    expect(stored.status).toBe(ERefreshTokenStatus.ACTIVE);
    expect(stored.expiredAt.getTime() - stored.issuedAt.getTime()).toBe(
      3600 * 1000,
    );
  });

  it('rejects an unknown identifier', async () => {
    await expect(useCase.execute(input)).rejects.toThrow(
      InvalidCredentialsException,
    );
  });

  it('rejects a wrong password', async () => {
    register({});

    await expect(
      useCase.execute({ ...input, password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsException);
    expect(refreshTokens.items.size).toBe(0);
  });

  it('rejects a login type that does not match the account', async () => {
    register({ loginType: ELoginType.PHONE });

    await expect(useCase.execute(input)).rejects.toThrow(
      InvalidCredentialsException,
    );
  });

  it('rejects a pending distributor with the right password', async () => {
    register({
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });

    await expect(useCase.execute(input)).rejects.toThrow(
      UserNotActiveException,
    );
    expect(refreshTokens.items.size).toBe(0);
    expect(accessTokens.signed).toHaveLength(0);
  });

  it('checks the password before the status', async () => {
    register({
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });

    await expect(
      useCase.execute({ ...input, password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsException);
  });
});
