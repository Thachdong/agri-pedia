import { InMemoryUnitOfWork } from '@shared/database';
import { ILocationQueryPort } from '@modules/location/contracts';
import {
  Address,
  Coordinates,
  ELoginType,
  EUserRole,
  InvalidCoordinatesException,
  InvalidLocationException,
  User,
  UserNotFoundException,
} from '../../domain';
import {
  InMemoryAddressRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import { CreateAddressUseCase } from './create-address.use-case';

const locationQuery: ILocationQueryPort = {
  provinceExists: async (provinceCode) => provinceCode === 'ha_noi',
  wardBelongsToProvince: async (provinceCode, wardCode) =>
    provinceCode === 'ha_noi' && wardCode === 'phuong_ba_dinh',
};

describe('CreateAddressUseCase', () => {
  let users: InMemoryUserRepository;
  let addresses: InMemoryAddressRepository;
  let useCase: CreateAddressUseCase;
  let user: User;
  let primary: Address;

  const input = () => ({
    userId: user.id,
    province: ' ha_noi ',
    ward: ' phuong_ba_dinh ',
    houseNumber: ' 5 ',
    lat: 21.03,
    long: 105.85,
  });

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    addresses = new InMemoryAddressRepository();
    useCase = new CreateAddressUseCase(
      users,
      addresses,
      new InMemoryUnitOfWork(),
      locationQuery,
    );
    user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: 'hash(user@mail.com)',
      encryptedIdentifier: 'enc(user@mail.com)',
      passwordHash: 'pwd(secret)',
      username: 'farmer',
      role: EUserRole.FARMER,
      businessType: null,
    });
    users.items.set(user.id, user);
    primary = Address.createPrimary({
      userId: user.id,
      province: 'can_tho',
      ward: 'phuong_ninh_kieu',
      houseNumber: '12',
      coordinates: Coordinates.create(10.03, 105.78),
    });
    await addresses.save(primary);
  });

  it('creates a non-primary address and keeps the current primary', async () => {
    const { addressId } = await useCase.execute(input());

    const created = addresses.items.get(addressId)!;
    expect(created.userId).toBe(user.id);
    expect(created.province).toBe('ha_noi');
    expect(created.ward).toBe('phuong_ba_dinh');
    expect(created.houseNumber).toBe('5');
    expect(created.coordinates).toEqual({ lat: 21.03, long: 105.85 });
    expect(created.isPrimary).toBe(false);
    expect(addresses.items.get(primary.id)!.isPrimary).toBe(true);
  });

  it('moves the primary flag to a new primary address', async () => {
    const { addressId } = await useCase.execute({
      ...input(),
      isPrimary: true,
    });

    expect(addresses.items.get(addressId)!.isPrimary).toBe(true);
    expect(addresses.items.get(primary.id)!.isPrimary).toBe(false);
  });

  it('creates a primary address when the user has none', async () => {
    addresses.items.clear();

    const { addressId } = await useCase.execute({
      ...input(),
      isPrimary: true,
    });

    expect(addresses.items.get(addressId)!.isPrimary).toBe(true);
  });

  it('rejects a ward outside the province', async () => {
    await expect(
      useCase.execute({ ...input(), ward: 'phuong_ninh_kieu' }),
    ).rejects.toThrow(InvalidLocationException);
    expect(addresses.items.size).toBe(1);
  });

  it('rejects invalid coordinates', async () => {
    await expect(useCase.execute({ ...input(), lat: 91 })).rejects.toThrow(
      InvalidCoordinatesException,
    );
  });

  it('rejects an unknown user', async () => {
    await expect(
      useCase.execute({ ...input(), userId: 'missing' }),
    ).rejects.toThrow(UserNotFoundException);
    expect(addresses.items.size).toBe(1);
  });
});
