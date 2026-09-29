import { Address } from '../../../domain';
import { IAddressRepository } from '../address.repository';

export class InMemoryAddressRepository implements IAddressRepository {
  readonly items = new Map<string, Address>();

  async save(address: Address): Promise<void> {
    this.items.set(address.id, address);
  }

  async findPrimaryByUserId(userId: string): Promise<Address | null> {
    return (
      [...this.items.values()].find(
        (address) => address.userId === userId && address.isPrimary,
      ) ?? null
    );
  }
}
