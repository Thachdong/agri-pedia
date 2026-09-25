import { User } from '../../../domain';
import { IUserRepository } from '../user.repository';

export class InMemoryUserRepository implements IUserRepository {
  readonly items = new Map<string, User>();

  async existsByHashedIdentifier(hashedIdentifier: string): Promise<boolean> {
    return [...this.items.values()].some(
      (user) => user.hashedIdentifier === hashedIdentifier,
    );
  }

  async save(user: User): Promise<void> {
    this.items.set(user.id, user);
  }
}
