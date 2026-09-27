import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  ELoginType,
  ERefreshTokenStatus,
  EUserRole,
  RefreshToken,
  User,
  UserNotFoundException,
  WrongPasswordException,
} from '../../domain';
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import { ChangePasswordUseCase } from './change-password.use-case';

describe('ChangePasswordUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let useCase: ChangePasswordUseCase;

  const registerUser = (identifier: string) => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: `hash(${identifier})`,
      encryptedIdentifier: `enc(${identifier})`,
      passwordHash: 'pwd(old-secret)',
      username: identifier,
      role: EUserRole.FARMER,
      businessType: null,
    });
    users.items.set(user.id, user);
    return user;
  };

  const login = (hashedIdentifier: string) => {
    const token = RefreshToken.issue({
      hashedToken: `hash(token-${refreshTokens.items.size})`,
      hashedIdentifier,
      ttlSeconds: 3600,
    });
    refreshTokens.items.set(token.id, token);
    return token.id;
  };

  const statusOf = (id: string) => refreshTokens.items.get(id)?.status;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    useCase = new ChangePasswordUseCase(
      users,
      refreshTokens,
      new InMemoryCryptoService(),
      new InMemoryUnitOfWork(),
    );
  });

  it('replaces the password and ends every session of the user', async () => {
    const user = registerUser('farmer@mail.com');
    const phone = login(user.hashedIdentifier);
    const laptop = login(user.hashedIdentifier);
    const other = login('hash(other@mail.com)');

    await useCase.execute({
      userId: user.id,
      oldPassword: 'old-secret',
      newPassword: 'new-secret',
    });

    expect(users.items.get(user.id)?.passwordHash).toBe('pwd(new-secret)');
    expect(statusOf(phone)).toBe(ERefreshTokenStatus.REVOKED);
    expect(statusOf(laptop)).toBe(ERefreshTokenStatus.REVOKED);
    expect(statusOf(other)).toBe(ERefreshTokenStatus.ACTIVE);
  });

  it('throws WrongPassword and changes nothing when the old password does not match', async () => {
    const user = registerUser('farmer@mail.com');
    const phone = login(user.hashedIdentifier);

    await expect(
      useCase.execute({
        userId: user.id,
        oldPassword: 'guess',
        newPassword: 'new-secret',
      }),
    ).rejects.toThrow(WrongPasswordException);

    expect(users.items.get(user.id)?.passwordHash).toBe('pwd(old-secret)');
    expect(statusOf(phone)).toBe(ERefreshTokenStatus.ACTIVE);
  });

  it('throws UserNotFound for an unknown user', async () => {
    await expect(
      useCase.execute({
        userId: 'ghost',
        oldPassword: 'old-secret',
        newPassword: 'new-secret',
      }),
    ).rejects.toThrow(UserNotFoundException);
  });
});
