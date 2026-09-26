import { InMemoryAccessTokenService } from '@shared/access-token';
import { IConfigService } from '@shared/config';
import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  EBusinessType,
  ELoginType,
  ERefreshTokenStatus,
  EUserRole,
  InvalidRefreshTokenException,
  RefreshToken,
  TRefreshTokenProps,
  User,
} from '../../domain';
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import { RefreshAccessTokenUseCase } from './refresh-access-token.use-case';

const config = {
  get: () => ({ refreshTokenTtlSeconds: 3600, refreshTokenGraceSeconds: 30 }),
} as unknown as IConfigService;

const HASHED_IDENTIFIER = 'hash(farmer@mail.com)';
const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000);

describe('RefreshAccessTokenUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let crypto: InMemoryCryptoService;
  let accessTokens: InMemoryAccessTokenService;
  let useCase: RefreshAccessTokenUseCase;
  let user: User;

  const registerUser = (
    overrides: Partial<Parameters<typeof User.register>[0]> = {},
  ) => {
    const registered = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: HASHED_IDENTIFIER,
      encryptedIdentifier: 'enc(farmer@mail.com)',
      passwordHash: 'pwd(secret123)',
      username: 'farmer01',
      role: EUserRole.FARMER,
      businessType: null,
      ...overrides,
    });
    users.items.set(registered.id, registered);
    return registered;
  };

  const storeToken = (
    id: string,
    raw: string,
    props: Partial<TRefreshTokenProps> = {},
  ) => {
    const token = RefreshToken.restore(id, {
      familyId: 'family-1',
      hashedToken: `hash(${raw})`,
      hashedIdentifier: HASHED_IDENTIFIER,
      issuedAt: secondsAgo(600),
      expiredAt: new Date(Date.now() + 3600 * 1000),
      status: ERefreshTokenStatus.ACTIVE,
      rotatedFromId: null,
      ...props,
    });
    refreshTokens.items.set(id, token);
    return token;
  };

  const statusOf = (id: string) => refreshTokens.items.get(id)?.status;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    crypto = new InMemoryCryptoService();
    crypto.nextToken = 'raw-new';
    accessTokens = new InMemoryAccessTokenService();
    useCase = new RefreshAccessTokenUseCase(
      refreshTokens,
      users,
      crypto,
      accessTokens,
      config,
      new InMemoryUnitOfWork(),
    );
    user = registerUser();
  });

  it('rotates an ACTIVE token and signs a new access token', async () => {
    storeToken('t1', 'raw-1');

    const output = await useCase.execute({ refreshToken: 'raw-1' });

    expect(output).toEqual({
      accessToken: `access(${user.id})`,
      refreshToken: 'raw-new',
    });
    expect(statusOf('t1')).toBe(ERefreshTokenStatus.ROTATED);
    const child = await refreshTokens.findByRotatedFromId('t1');
    expect(child).toMatchObject({
      familyId: 'family-1',
      hashedToken: 'hash(raw-new)',
      status: ERefreshTokenStatus.ACTIVE,
    });
  });

  it('rejects an unknown token', async () => {
    await expect(useCase.execute({ refreshToken: 'nope' })).rejects.toThrow(
      InvalidRefreshTokenException,
    );
  });

  it('rejects an expired token without revoking the family', async () => {
    storeToken('t1', 'raw-1', { expiredAt: secondsAgo(1) });

    await expect(useCase.execute({ refreshToken: 'raw-1' })).rejects.toThrow(
      InvalidRefreshTokenException,
    );
    expect(statusOf('t1')).toBe(ERefreshTokenStatus.ACTIVE);
  });

  it('rotates the child when a ROTATED token is retried within the grace period', async () => {
    storeToken('t1', 'raw-1', { status: ERefreshTokenStatus.ROTATED });
    storeToken('t2', 'raw-2', { rotatedFromId: 't1', issuedAt: secondsAgo(5) });

    const output = await useCase.execute({ refreshToken: 'raw-1' });

    expect(output.refreshToken).toBe('raw-new');
    expect(statusOf('t2')).toBe(ERefreshTokenStatus.ROTATED);
    expect((await refreshTokens.findByRotatedFromId('t2'))?.status).toBe(
      ERefreshTokenStatus.ACTIVE,
    );
  });

  it('revokes the family when a ROTATED token is reused past the grace period', async () => {
    storeToken('t1', 'raw-1', { status: ERefreshTokenStatus.ROTATED });
    storeToken('t2', 'raw-2', {
      rotatedFromId: 't1',
      issuedAt: secondsAgo(60),
    });
    storeToken('other', 'raw-other', { familyId: 'family-2' });

    await expect(useCase.execute({ refreshToken: 'raw-1' })).rejects.toThrow(
      InvalidRefreshTokenException,
    );
    expect(statusOf('t1')).toBe(ERefreshTokenStatus.REVOKED);
    expect(statusOf('t2')).toBe(ERefreshTokenStatus.REVOKED);
    expect(statusOf('other')).toBe(ERefreshTokenStatus.ACTIVE);
    expect(accessTokens.signed).toHaveLength(0);
  });

  it('revokes the family when the child was already rotated too', async () => {
    storeToken('t1', 'raw-1', { status: ERefreshTokenStatus.ROTATED });
    storeToken('t2', 'raw-2', {
      rotatedFromId: 't1',
      issuedAt: secondsAgo(5),
      status: ERefreshTokenStatus.ROTATED,
    });

    await expect(useCase.execute({ refreshToken: 'raw-1' })).rejects.toThrow(
      InvalidRefreshTokenException,
    );
    expect(statusOf('t1')).toBe(ERefreshTokenStatus.REVOKED);
  });

  it('revokes the family when a REVOKED token is presented', async () => {
    storeToken('t1', 'raw-1', { status: ERefreshTokenStatus.REVOKED });
    storeToken('t2', 'raw-2', { rotatedFromId: 't1' });

    await expect(useCase.execute({ refreshToken: 'raw-1' })).rejects.toThrow(
      InvalidRefreshTokenException,
    );
    expect(statusOf('t2')).toBe(ERefreshTokenStatus.REVOKED);
  });

  it('rejects when the owner no longer exists', async () => {
    users.items.clear();
    storeToken('t1', 'raw-1');

    await expect(useCase.execute({ refreshToken: 'raw-1' })).rejects.toThrow(
      InvalidRefreshTokenException,
    );
    expect(statusOf('t1')).toBe(ERefreshTokenStatus.ACTIVE);
  });

  it('rejects when the owner is not ACTIVE', async () => {
    users.items.clear();
    registerUser({
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });
    storeToken('t1', 'raw-1');

    await expect(useCase.execute({ refreshToken: 'raw-1' })).rejects.toThrow(
      InvalidRefreshTokenException,
    );
  });
});
