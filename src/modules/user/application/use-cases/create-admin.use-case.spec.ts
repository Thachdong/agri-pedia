import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  ELoginType,
  EUserRole,
  EUserStatus,
  UserIdentifierAlreadyUsedException,
} from '../../domain';
import { InMemoryUserRepository } from '../ports/fakes';
import { CreateAdminUseCase } from './create-admin.use-case';

describe('CreateAdminUseCase', () => {
  let users: InMemoryUserRepository;
  let useCase: CreateAdminUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    useCase = new CreateAdminUseCase(
      users,
      new InMemoryCryptoService(),
      new InMemoryUnitOfWork(),
    );
  });

  it('creates an active admin with hashed/encrypted identifier', async () => {
    const { userId } = await useCase.execute({
      loginType: ELoginType.EMAIL,
      identifier: ' Admin@Mail.com ',
      password: 'secret123',
    });

    const user = users.items.get(userId);
    expect(user?.role).toBe(EUserRole.ADMIN);
    expect(user?.status).toBe(EUserStatus.ACTIVE);
    expect(user?.hashedIdentifier).toBe('hash(admin@mail.com)');
    expect(user?.encryptedIdentifier).toBe('enc(admin@mail.com)');
    expect(user?.passwordHash).toBe('pwd(secret123)');
    expect(user?.username).toBe('admin@mail.com');
  });

  it('uses the given username', async () => {
    const { userId } = await useCase.execute({
      loginType: ELoginType.EMAIL,
      identifier: 'admin@mail.com',
      password: 'secret123',
      username: ' Content Team ',
    });

    expect(users.items.get(userId)?.username).toBe('Content Team');
  });

  it('rejects an identifier already used', async () => {
    const input = {
      loginType: ELoginType.EMAIL,
      identifier: 'admin@mail.com',
      password: 'secret123',
    };
    await useCase.execute(input);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      UserIdentifierAlreadyUsedException,
    );
    expect(users.items.size).toBe(1);
  });
});
