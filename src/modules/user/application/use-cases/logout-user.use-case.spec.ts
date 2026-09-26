import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  ELoginType,
  ERefreshTokenStatus,
  EUserRole,
  RefreshToken,
  TRefreshTokenProps,
  User,
} from '../../domain';
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import { LogoutUserUseCase } from './logout-user.use-case';

describe('LogoutUserUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let useCase: LogoutUserUseCase;

  const registerUser = (identifier: string) => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: `hash(${identifier})`,
      encryptedIdentifier: `enc(${identifier})`,
      passwordHash: 'pwd(secret123)',
      username: identifier,
      role: EUserRole.FARMER,
      businessType: null,
    });
    users.items.set(user.id, user);
    return user;
  };

  const storeToken = (
    id: string,
    raw: string,
    props: Partial<TRefreshTokenProps> = {},
  ) => {
    refreshTokens.items.set(
      id,
      RefreshToken.restore(id, {
        familyId: 'family-1',
        hashedToken: `hash(${raw})`,
        hashedIdentifier: 'hash(farmer@mail.com)',
        issuedAt: new Date(),
        expiredAt: new Date(Date.now() + 3600 * 1000),
        status: ERefreshTokenStatus.ACTIVE,
        rotatedFromId: null,
        ...props,
      }),
    );
  };

  const statusOf = (id: string) => refreshTokens.items.get(id)?.status;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    useCase = new LogoutUserUseCase(
      refreshTokens,
      users,
      new InMemoryCryptoService(),
      new InMemoryUnitOfWork(),
    );
  });

  it('revokes every token of the session', async () => {
    const user = registerUser('farmer@mail.com');
    storeToken('t1', 'raw-1', { status: ERefreshTokenStatus.ROTATED });
    storeToken('t2', 'raw-2', { rotatedFromId: 't1' });
    storeToken('other', 'raw-other', { familyId: 'family-2' });

    await useCase.execute({ userId: user.id, refreshToken: 'raw-2' });

    expect(statusOf('t1')).toBe(ERefreshTokenStatus.REVOKED);
    expect(statusOf('t2')).toBe(ERefreshTokenStatus.REVOKED);
    expect(statusOf('other')).toBe(ERefreshTokenStatus.ACTIVE);
  });

  it('does nothing for an unknown token', async () => {
    const user = registerUser('farmer@mail.com');
    storeToken('t1', 'raw-1');

    await expect(
      useCase.execute({ userId: user.id, refreshToken: 'nope' }),
    ).resolves.toBeUndefined();
    expect(statusOf('t1')).toBe(ERefreshTokenStatus.ACTIVE);
  });

  it("does not revoke another user's session", async () => {
    const intruder = registerUser('intruder@mail.com');
    storeToken('t1', 'raw-1');

    await useCase.execute({ userId: intruder.id, refreshToken: 'raw-1' });

    expect(statusOf('t1')).toBe(ERefreshTokenStatus.ACTIVE);
  });

  it('does nothing when the caller no longer exists', async () => {
    storeToken('t1', 'raw-1');

    await useCase.execute({ userId: 'ghost', refreshToken: 'raw-1' });

    expect(statusOf('t1')).toBe(ERefreshTokenStatus.ACTIVE);
  });
});
