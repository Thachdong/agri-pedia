import { InMemoryUnitOfWork } from '@shared/database';
import { Address, AddressNotFoundException, Coordinates } from '../../domain';
import { InMemoryAddressRepository } from '../ports/fakes';
import { SetPrimaryAddressUseCase } from './set-primary-address.use-case';

describe('SetPrimaryAddressUseCase', () => {
  let addresses: InMemoryAddressRepository;
  let useCase: SetPrimaryAddressUseCase;

  const addAddress = async (userId: string, isPrimary: boolean) => {
    const address = Address.create({
      userId,
      province: 'ha_noi',
      ward: 'phuong_ba_dinh',
      houseNumber: '5',
      coordinates: Coordinates.create(21.03, 105.85),
      isPrimary,
    });
    await addresses.save(address);
    return address;
  };
  const isPrimary = (address: Address) =>
    addresses.items.get(address.id)!.isPrimary;

  beforeEach(() => {
    addresses = new InMemoryAddressRepository();
    useCase = new SetPrimaryAddressUseCase(addresses, new InMemoryUnitOfWork());
  });

  it('moves the primary flag to the given address', async () => {
    const primary = await addAddress('user-1', true);
    const other = await addAddress('user-1', false);
    const otherUsersPrimary = await addAddress('user-2', true);

    await useCase.execute({ userId: 'user-1', addressId: other.id });

    expect(isPrimary(other)).toBe(true);
    expect(isPrimary(primary)).toBe(false);
    expect(isPrimary(otherUsersPrimary)).toBe(true);
  });

  it('marks the address when the user has no primary', async () => {
    const address = await addAddress('user-1', false);

    await useCase.execute({ userId: 'user-1', addressId: address.id });

    expect(isPrimary(address)).toBe(true);
  });

  it('keeps an address that is already primary', async () => {
    const primary = await addAddress('user-1', true);

    await useCase.execute({ userId: 'user-1', addressId: primary.id });

    expect(isPrimary(primary)).toBe(true);
  });

  it('rejects an unknown address', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', addressId: 'missing' }),
    ).rejects.toThrow(AddressNotFoundException);
  });

  it("rejects another user's address", async () => {
    const primary = await addAddress('user-1', true);
    const otherUsers = await addAddress('user-2', false);

    await expect(
      useCase.execute({ userId: 'user-1', addressId: otherUsers.id }),
    ).rejects.toThrow(AddressNotFoundException);
    expect(isPrimary(otherUsers)).toBe(false);
    expect(isPrimary(primary)).toBe(true);
  });
});
