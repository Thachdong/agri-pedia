import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUserRepository } from '../../application/ports/fakes';
import { ELoginType, EUserRole, EBusinessType, User } from '../../domain';
import { UserQueryService } from './user-query.service';

const userWith = (hashedIdentifier: string) =>
  User.register({
    loginType: ELoginType.PHONE,
    hashedIdentifier,
    encryptedIdentifier: 'enc',
    passwordHash: 'pwd',
    username: 'shop',
    role: EUserRole.DISTRIBUTOR,
    businessType: EBusinessType.SEEDS_SEEDLINGS,
  });

describe('UserQueryService.findByIdentifier', () => {
  let users: InMemoryUserRepository;
  let service: UserQueryService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new UserQueryService(users, new InMemoryCryptoService());
  });

  it('finds a user by a phone typed with separators', async () => {
    const user = userWith('hash(0912345678)');
    await users.save(user);
    await expect(service.findByIdentifier(' 0912 345-678 ')).resolves.toEqual({
      userId: user.id,
      hashedIdentifier: 'hash(0912345678)',
    });
  });

  it('finds a user by an email typed in another casing', async () => {
    const user = userWith('hash(shop@mail.com)');
    await users.save(user);
    await expect(service.findByIdentifier('Shop@Mail.COM')).resolves.toEqual({
      userId: user.id,
      hashedIdentifier: 'hash(shop@mail.com)',
    });
  });

  it('returns null for an unknown identifier', async () => {
    await expect(
      service.findByIdentifier('nobody@mail.com'),
    ).resolves.toBeNull();
  });
});
