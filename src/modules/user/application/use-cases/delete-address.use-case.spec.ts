import { InMemoryUnitOfWork } from '@shared/database';
import {
  Address,
  AddressNotFoundException,
  Coordinates,
  PrimaryAddressNotDeletableException,
} from '../../domain';
import { InMemoryAddressRepository } from '../ports/fakes';
import { DeleteAddressUseCase } from './delete-address.use-case';

describe('DeleteAddressUseCase', () => {
  let addresses: InMemoryAddressRepository;
  let useCase: DeleteAddressUseCase;

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

  beforeEach(() => {
    addresses = new InMemoryAddressRepository();
    useCase = new DeleteAddressUseCase(addresses, new InMemoryUnitOfWork());
  });

  it('deletes a non-primary address of the caller', async () => {
    const primary = await addAddress('user-1', true);
    const other = await addAddress('user-1', false);

    await useCase.execute({ userId: 'user-1', addressId: other.id });

    expect(addresses.items.has(other.id)).toBe(false);
    expect(addresses.items.has(primary.id)).toBe(true);
  });

  it('rejects the primary address', async () => {
    const primary = await addAddress('user-1', true);

    await expect(
      useCase.execute({ userId: 'user-1', addressId: primary.id }),
    ).rejects.toThrow(PrimaryAddressNotDeletableException);
    expect(addresses.items.has(primary.id)).toBe(true);
  });

  it('rejects an unknown address', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', addressId: 'missing' }),
    ).rejects.toThrow(AddressNotFoundException);
  });

  it("rejects another user's address", async () => {
    const otherUsers = await addAddress('user-2', false);

    await expect(
      useCase.execute({ userId: 'user-1', addressId: otherUsers.id }),
    ).rejects.toThrow(AddressNotFoundException);
    expect(addresses.items.has(otherUsers.id)).toBe(true);
  });
});
