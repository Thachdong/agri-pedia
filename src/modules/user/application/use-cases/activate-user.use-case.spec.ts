import { InMemoryUnitOfWork } from '@shared/database';
import {
  EBusinessType,
  ELoginType,
  EUserRole,
  EUserStatus,
  User,
  UserNotFoundException,
} from '../../domain';
import { InMemoryUserRepository } from '../ports/fakes';
import { ActivateUserUseCase } from './activate-user.use-case';

describe('ActivateUserUseCase', () => {
  let users: InMemoryUserRepository;
  let useCase: ActivateUserUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    useCase = new ActivateUserUseCase(users, new InMemoryUnitOfWork());
  });

  it('activates a pending distributor', async () => {
    const user = User.register({
      loginType: ELoginType.PHONE,
      hashedIdentifier: 'hash',
      encryptedIdentifier: 'enc',
      passwordHash: 'pwd',
      username: 'shop',
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });
    await users.save(user);

    await useCase.execute({ userId: user.id });

    const saved = (await users.findById(user.id))!;
    expect(saved.status).toBe(EUserStatus.ACTIVE);
    expect(saved.identifierVerifiedAt).toEqual(expect.any(Date));
  });

  it('throws UserNotFound for an unknown user', async () => {
    await expect(useCase.execute({ userId: 'missing' })).rejects.toThrow(
      UserNotFoundException,
    );
  });
});
