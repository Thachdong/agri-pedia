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
      identifier: '0912345678',
      hashedIdentifier: 'hash(0912345678)',
      loginType: 'PHONE',
      canLogin: false,
    });
  });

  it('finds a user by an email typed in another casing', async () => {
    const user = userWith('hash(shop@mail.com)');
    await users.save(user);
    await expect(service.findByIdentifier('Shop@Mail.COM')).resolves.toEqual({
      userId: user.id,
      identifier: 'shop@mail.com',
      hashedIdentifier: 'hash(shop@mail.com)',
      loginType: 'PHONE',
      canLogin: false,
    });
  });

  it('reports an activated account as able to log in', async () => {
    const user = userWith('hash(0912345678)');
    user.activate();
    await users.save(user);
    await expect(service.findByIdentifier('0912345678')).resolves.toMatchObject(
      { canLogin: true },
    );
  });

  it('returns null for an unknown identifier', async () => {
    await expect(
      service.findByIdentifier('nobody@mail.com'),
    ).resolves.toBeNull();
  });
});

describe('UserQueryService.findRoleById', () => {
  let users: InMemoryUserRepository;
  let service: UserQueryService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new UserQueryService(users, new InMemoryCryptoService());
  });

  it('reports a pending distributor as not active', async () => {
    const user = userWith('hash(0912345678)');
    await users.save(user);
    await expect(service.findRoleById(user.id)).resolves.toEqual({
      userId: user.id,
      role: 'DISTRIBUTOR',
      isActive: false,
    });
  });

  it('reports an activated distributor as active', async () => {
    const user = userWith('hash(0912345678)');
    user.activate();
    await users.save(user);
    await expect(service.findRoleById(user.id)).resolves.toMatchObject({
      isActive: true,
    });
  });

  it('returns null for an unknown id', async () => {
    await expect(service.findRoleById('missing')).resolves.toBeNull();
  });
});

describe('UserQueryService.findProfileById', () => {
  let users: InMemoryUserRepository;
  let service: UserQueryService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new UserQueryService(users, new InMemoryCryptoService());
  });

  it('returns the public profile of the user', async () => {
    const user = userWith('hash(0912345678)');
    await users.save(user);
    await expect(service.findProfileById(user.id)).resolves.toEqual({
      userId: user.id,
      username: 'shop',
      role: 'DISTRIBUTOR',
    });
  });

  it('returns null for an unknown id', async () => {
    await expect(service.findProfileById('missing')).resolves.toBeNull();
  });
});

describe('UserQueryService.listProfilesByIds', () => {
  let users: InMemoryUserRepository;
  let service: UserQueryService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new UserQueryService(users, new InMemoryCryptoService());
  });

  it('returns the profiles of known ids, once each', async () => {
    const first = userWith('hash(0912345678)');
    const second = userWith('hash(0987654321)');
    await users.save(first);
    await users.save(second);

    const profiles = await service.listProfilesByIds([
      first.id,
      'missing',
      second.id,
      first.id,
    ]);

    expect(profiles).toHaveLength(2);
    expect(profiles).toEqual(
      expect.arrayContaining([
        { userId: first.id, username: 'shop', role: 'DISTRIBUTOR' },
        { userId: second.id, username: 'shop', role: 'DISTRIBUTOR' },
      ]),
    );
  });

  it('returns an empty list for no ids', async () => {
    await expect(service.listProfilesByIds([])).resolves.toEqual([]);
  });
});
