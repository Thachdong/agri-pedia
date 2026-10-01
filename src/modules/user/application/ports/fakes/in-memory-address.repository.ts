import { Address } from '../../../domain';
import { IAddressRepository } from '../address.repository';

export class InMemoryAddressRepository implements IAddressRepository {
  readonly items = new Map<string, Address>();

  async save(address: Address): Promise<void> {
    this.items.set(address.id, address);
  }

  async findById(id: string): Promise<Address | null> {
    return this.items.get(id) ?? null;
  }

  async findPrimaryByUserId(userId: string): Promise<Address | null> {
    return (
      [...this.items.values()].find(
        (address) => address.userId === userId && address.isPrimary,
      ) ?? null
    );
  }

  async findAllByUserId(userId: string): Promise<Address[]> {
    return [...this.items.values()]
      .filter((address) => address.userId === userId)
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
  }
}
