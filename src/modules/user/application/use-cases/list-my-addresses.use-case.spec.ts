import {
  Address,
  Coordinates,
  EBusinessType,
  ELoginType,
  EUserRole,
  User,
  UserNotFoundException,
} from '../../domain';
import {
  InMemoryAddressRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import { ListMyAddressesUseCase } from './list-my-addresses.use-case';

describe('ListMyAddressesUseCase', () => {
  let users: InMemoryUserRepository;
  let addresses: InMemoryAddressRepository;
  let useCase: ListMyAddressesUseCase;

  const register = (role: EUserRole) => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: 'hash(user@mail.com)',
      encryptedIdentifier: 'enc(user@mail.com)',
      passwordHash: 'pwd(secret)',
      username: 'user',
      role,
      businessType:
        role === EUserRole.DISTRIBUTOR ? EBusinessType.SEEDS_SEEDLINGS : null,
    });
    users.items.set(user.id, user);
    return user;
  };

  const addAddress = async (
    userId: string,
    { id, isPrimary }: { id: string; isPrimary: boolean },
  ) => {
    await addresses.save(
      Address.restore(id, {
        userId,
        province: 'ha_noi',
        ward: 'phuong_ba_dinh',
        houseNumber: `house ${id}`,
        coordinates: Coordinates.create(21.03, 105.82),
        isPrimary,
      }),
    );
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    addresses = new InMemoryAddressRepository();
    useCase = new ListMyAddressesUseCase(users, addresses);
  });

  it('returns every address of the caller, primary first', async () => {
    const user = register(EUserRole.FARMER);
    await addAddress(user.id, { id: 'a-2', isPrimary: false });
    await addAddress(user.id, { id: 'a-3', isPrimary: true });
    await addAddress(user.id, { id: 'a-1', isPrimary: false });
    const other = register(EUserRole.DISTRIBUTOR);
    await addAddress(other.id, { id: 'a-0', isPrimary: true });

    const output = await useCase.execute({ userId: user.id });

    expect(output.addresses).toEqual([
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
    ]);
  });

  it('returns the addresses of a distributor that is not active', async () => {
    const user = register(EUserRole.DISTRIBUTOR);
    await addAddress(user.id, { id: 'a-1', isPrimary: true });

    const output = await useCase.execute({ userId: user.id });

    expect(output.addresses).toHaveLength(1);
  });

  it('returns an empty list when the caller has no address', async () => {
    const user = register(EUserRole.FARMER);

    const output = await useCase.execute({ userId: user.id });

    expect(output.addresses).toEqual([]);
  });

  it('rejects an unknown user', async () => {
    await expect(useCase.execute({ userId: 'missing' })).rejects.toThrow(
      UserNotFoundException,
    );
  });
});
