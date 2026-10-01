import {
  Address,
  Coordinates,
  DistributorNotFoundException,
  EBusinessType,
  ELoginType,
  EUserRole,
  User,
} from '../../domain';
import {
  InMemoryAddressRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import { GetDistributorProfileUseCase } from './get-distributor-profile.use-case';

describe('GetDistributorProfileUseCase', () => {
  let users: InMemoryUserRepository;
  let addresses: InMemoryAddressRepository;
  let useCase: GetDistributorProfileUseCase;

  const register = (role: EUserRole, { active = true } = {}) => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: 'hash(user@mail.com)',
      encryptedIdentifier: 'enc(user@mail.com)',
      passwordHash: 'pwd(secret)',
      username: 'seed-shop',
      role,
      businessType:
        role === EUserRole.DISTRIBUTOR ? EBusinessType.SEEDS_SEEDLINGS : null,
      bio: 'bio',
    });
    if (active) {
      user.activate();
    }
    users.items.set(user.id, user);
    return user;
  };

  const addAddress = async (
    userId: string,
    { id, isPrimary }: { id: string; isPrimary: boolean },
  ) => {
    const address = Address.restore(id, {
      userId,
      province: 'ha_noi',
      ward: 'phuong_ba_dinh',
      houseNumber: `house ${id}`,
      coordinates: Coordinates.create(21.03, 105.82),
      isPrimary,
    });
    await addresses.save(address);
    return address;
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    addresses = new InMemoryAddressRepository();
    useCase = new GetDistributorProfileUseCase(users, addresses);
  });

  it('returns the profile with all addresses, primary first', async () => {
    const user = register(EUserRole.DISTRIBUTOR);
    await addAddress(user.id, { id: 'a-2', isPrimary: false });
    await addAddress(user.id, { id: 'a-3', isPrimary: true });
    await addAddress(user.id, { id: 'a-1', isPrimary: false });
    const other = register(EUserRole.DISTRIBUTOR);
    await addAddress(other.id, { id: 'a-0', isPrimary: true });

    const output = await useCase.execute({ distributorId: user.id });

    expect(output).toEqual({
      id: user.id,
      username: 'seed-shop',
      avatar: null,
      bio: 'bio',
      businessType: EBusinessType.SEEDS_SEEDLINGS,
      createdAt: user.createdAt,
      addresses: [
        {
          id: 'a-3',
          province: 'ha_noi',
          ward: 'phuong_ba_dinh',
          houseNumber: 'house a-3',
          lat: 21.03,
          long: 105.82,
          isPrimary: true,
        },
        expect.objectContaining({ id: 'a-1', isPrimary: false }),
        expect.objectContaining({ id: 'a-2', isPrimary: false }),
      ],
    });
  });

  it('returns an empty address list when the distributor has none', async () => {
    const user = register(EUserRole.DISTRIBUTOR);

    const output = await useCase.execute({ distributorId: user.id });

    expect(output.addresses).toEqual([]);
  });

  it('rejects an unknown id', async () => {
    await expect(useCase.execute({ distributorId: 'missing' })).rejects.toThrow(
      DistributorNotFoundException,
    );
  });

  it('rejects a farmer', async () => {
    const user = register(EUserRole.FARMER);

    await expect(useCase.execute({ distributorId: user.id })).rejects.toThrow(
      DistributorNotFoundException,
    );
  });

  it('rejects a distributor that is not active', async () => {
    const user = register(EUserRole.DISTRIBUTOR, { active: false });

    await expect(useCase.execute({ distributorId: user.id })).rejects.toThrow(
      DistributorNotFoundException,
    );
  });
});
